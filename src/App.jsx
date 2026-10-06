import { useEffect, useMemo, useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import StatsCard from './components/StatsCard'
import Avatar from './components/Avatar'
import ToastList from './components/ToastList'
import AuthScreen from './components/AuthScreen'
import { appConfig } from './config/appConfig'
import { dataService } from './services/dataService'
import {
  ensureCurrentUserProfile,
  getCurrentSession,
  isSupabaseReady,
  signInWithEmail,
  signUpWithEmail,
  signOut,
} from './services/supabaseService'
import {
  TODAY_ISO,
  computeSummary,
  formatCurrency,
  formatDate,
  getExpiringSoonMembers,
  getMembershipStatus,
  getTodayAttendance,
  scanMemberQR,
  toDateInputValue,
} from './utils/gymLogic'

const navItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'scan', label: "Today's Attendance" },
  { key: 'members', label: 'Members' },
  { key: 'memberships', label: 'Memberships' },
  { key: 'payments', label: 'Payments' },
  { key: 'settings', label: 'Settings' },
]

const filterOptions = ['All', 'Active', 'Expiring Soon', 'Expired']

let toastCounter = 0
const getNextToastId = () => {
  toastCounter += 1
  return `toast-${toastCounter}`
}

const getFormattedCurrentTime = () => {
  const now = new Date()
  const hours = now.getHours()
  const mins = String(now.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const dispHour = hours % 12 || 12
  return `${dispHour}:${mins} ${ampm}`
}

const makeMemberForm = () => ({
  fullName: '',
  phone: '',
  memberId: '',
  plan: 'Monthly',
  fee: '500',
  startDate: '2026-10-06',
  expiryDate: '2026-11-06',
  paymentMethod: 'Cash',
  photo: '',
})

function App() {
  const [members, setMembers] = useState(() => dataService.getMembers())
  const [payments, setPayments] = useState(() => dataService.getPayments())
  const [settings, setSettings] = useState(() => dataService.getSettings())
  const [currentView, setCurrentView] = useState('dashboard')
  const [selectedMemberId, setSelectedMemberId] = useState('GF102')
  const [memberFilter, setMemberFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [renewMemberId, setRenewMemberId] = useState(null)
  const [scannerState, setScannerState] = useState({ type: 'idle' })
  const [toasts, setToasts] = useState([])
  const [memberForm, setMemberForm] = useState(makeMemberForm())
  const [renewalForm, setRenewalForm] = useState({
    amount: 500,
    expiryDate: '2026-11-05',
  })
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(() => isSupabaseReady)
  const [authError, setAuthError] = useState('')

  const userRole = session?.user?.app_metadata?.role || session?.user?.role || 'owner'

  useEffect(() => {
    if (!isSupabaseReady) return

    let cancelled = false

    const restoreSession = async () => {
      const { data, error } = await getCurrentSession()

      if (!cancelled) {
        if (error) {
          setAuthError(error.message)
        }
        setSession(data?.session || null)
        setAuthLoading(false)
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!session) return

    let cancelled = false

    const loadLiveDatabase = async () => {
      if (isSupabaseReady) {
        try {
          const [sbMembers, sbPayments, sbSettings] = await Promise.all([
            dataService.getMembersFromSupabase(),
            dataService.getPaymentsFromSupabase(),
            dataService.getSettingsFromSupabase(),
          ])

          if (!cancelled) {
            if (Array.isArray(sbMembers)) {
              setMembers(sbMembers)
              if (sbMembers.length > 0) {
                setSelectedMemberId(sbMembers[0].memberId)
              }
            }
            if (Array.isArray(sbPayments)) {
              setPayments(sbPayments)
            }
            if (sbSettings) {
              setSettings(sbSettings)
            }
          }
        } catch (err) {
          console.warn('Error loading live Supabase data:', err)
        }
      }
    }

    loadLiveDatabase()

    return () => {
      cancelled = true
    }
  }, [session])

  useEffect(() => {
    if (!isSupabaseReady) {
      dataService.saveMembers(members)
    }
  }, [members])

  useEffect(() => {
    if (!isSupabaseReady) {
      dataService.savePayments(payments)
    }
  }, [payments])

  useEffect(() => {
    if (!isSupabaseReady) {
      dataService.saveSettings(settings)
    }
  }, [settings])

  const selectedMember = members.find((member) => member.memberId === selectedMemberId) || members[0]

  const handleLogin = async (email, password) => {
    setAuthLoading(true)
    setAuthError('')

    try {
      const result = await signInWithEmail(email, password)
      setSession(result.session)
      try {
        await ensureCurrentUserProfile({ fullName: email.split('@')[0], role: 'owner' })
      } catch (profErr) {
        console.warn('Profile bootstrap error:', profErr)
      }
    } catch (error) {
      setAuthError(error.message || 'Unable to sign in. Please check your credentials.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignUp = async (email, password, fullName) => {
    setAuthLoading(true)
    setAuthError('')

    try {
      const result = await signUpWithEmail(email, password, { full_name: fullName })
      if (result.session) {
        setSession(result.session)
        try {
          await ensureCurrentUserProfile({ fullName, role: 'owner' })
        } catch (profErr) {
          console.warn('Profile bootstrap error:', profErr)
        }
        pushToast('Account registered successfully', 'success')
      } else {
        pushToast('Registration submitted. Check your email or sign in.', 'success')
      }
    } catch (error) {
      setAuthError(error.message || 'Unable to sign up. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleDemoContinue = () => {
    setSession({ user: { email: 'demo@gurufitness.local', app_metadata: { role: 'owner' } } })
    setAuthLoading(false)
    setAuthError('')
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } finally {
      setSession(null)
    }
  }

  const visibleNavItems = userRole === 'staff'
    ? navItems.filter((item) => !['settings', 'payments'].includes(item.key))
    : navItems

  const summary = useMemo(() => computeSummary(members), [members])
  const todayAttendance = useMemo(() => getTodayAttendance(members), [members])
  const expiringSoon = useMemo(() => getExpiringSoonMembers(members), [members])

  const filteredMembers = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase()

    return members.filter((member) => {
      const matchesSearch =
        !normalized ||
        member.name.toLowerCase().includes(normalized) ||
        member.phone.includes(normalized) ||
        member.memberId.toLowerCase().includes(normalized)

      const matchesFilter =
        memberFilter === 'All' ||
        getMembershipStatus(member) === memberFilter

      return matchesSearch && matchesFilter
    })
  }, [memberFilter, members, searchQuery])

  const pushToast = (message, type = 'success') => {
    const id = getNextToastId()
    setToasts((prev) => [...prev, { id, message, type }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 2600)
  }

  const handleDemoScan = (memberId) => {
    const member = members.find((entry) => entry.memberId === memberId)
    if (!member) return

    const alreadyMarked = member.attendanceHistory.some(
      (entry) => entry.date === TODAY_ISO && entry.status === 'Present',
    )

    if (alreadyMarked) {
      const todayEntry = member.attendanceHistory.find((entry) => entry.date === TODAY_ISO)
      setScannerState({ type: 'alreadyMarked', member, time: todayEntry?.time || '6:42 PM' })
      pushToast('Already marked today', 'warning')
      return
    }

    if (getMembershipStatus(member) === 'Expired') {
      setScannerState({ type: 'expired', member })
      return
    }

    setScannerState({ type: 'found', member, scanMeta: scanMemberQR(memberId) })
  }

  const handleMarkAttendance = async (memberId, allowExpired = false) => {
    const member = members.find((entry) => entry.memberId === memberId)
    if (!member) return

    const alreadyMarked = member.attendanceHistory.some(
      (entry) => entry.date === TODAY_ISO && entry.status === 'Present',
    )

    if (alreadyMarked) {
      const todayEntry = member.attendanceHistory.find((entry) => entry.date === TODAY_ISO)
      setScannerState({ type: 'alreadyMarked', member, time: todayEntry?.time || '6:42 PM' })
      pushToast('Already marked today', 'warning')
      return
    }

    const timeValue = getFormattedCurrentTime()

    const updatedMembers = members.map((entry) => {
      if (entry.memberId !== memberId) return entry
      return {
        ...entry,
        attendanceHistory: [{ date: TODAY_ISO, time: timeValue, status: 'Present' }, ...entry.attendanceHistory],
      }
    })

    setMembers(updatedMembers)
    setSelectedMemberId(memberId)
    setCurrentView('scan')

    try {
      await dataService.recordAttendance(memberId, allowExpired ? 'manual_override' : 'present')
    } catch (err) {
      console.warn('Attendance DB sync warning:', err)
    }

    if (allowExpired) {
      setScannerState({
        type: 'successWarning',
        member: updatedMembers.find((entry) => entry.memberId === memberId),
        time: timeValue,
        warning: 'Membership expired',
      })
      pushToast('Attendance marked with expired warning', 'warning')
      return
    }

    setScannerState({
      type: 'success',
      member: updatedMembers.find((entry) => entry.memberId === memberId),
      time: timeValue,
    })
    pushToast('Attendance marked', 'success')
  }

  const openRenewalModal = (member) => {
    const expiry = new Date(`${member.expiryDate}T00:00:00`)
    expiry.setMonth(expiry.getMonth() + 1)
    setRenewMemberId(member.memberId)
    setRenewalForm({
      amount: member.fee,
      expiryDate: expiry.toISOString().slice(0, 10),
    })
    setShowRenewModal(true)
  }

  const confirmRenewal = async () => {
    if (!renewMemberId) return

    const updatedMembers = members.map((member) => {
      if (member.memberId !== renewMemberId) return member
      return { ...member, expiryDate: renewalForm.expiryDate, fee: renewalForm.amount }
    })

    setMembers(updatedMembers)
    const renewedMember = updatedMembers.find((member) => member.memberId === renewMemberId)
    setSelectedMemberId(renewMemberId)
    setShowRenewModal(false)
    setScannerState({
      type: 'renewed',
      member: renewedMember,
      newExpiry: renewalForm.expiryDate,
    })
    pushToast('Membership renewed', 'success')

    try {
      await dataService.renewMembership(renewMemberId, {
        amount: renewalForm.amount,
        expiryDate: renewalForm.expiryDate,
      })
      if (isSupabaseReady && session) {
        const nextPayments = await dataService.getPaymentsFromSupabase()
        setPayments(nextPayments)
      }
    } catch (err) {
      console.warn('Renewal DB sync warning:', err)
    }
  }

  const handleAddMember = async (event) => {
    event.preventDefault()

    try {
      const created = await dataService.createMember({
        fullName: memberForm.fullName,
        phone: memberForm.phone,
        memberId: memberForm.memberId,
        plan: memberForm.plan,
        fee: Number(memberForm.fee || 500),
        startDate: memberForm.startDate,
        expiryDate: memberForm.expiryDate,
        paymentMethod: memberForm.paymentMethod,
        photo: memberForm.photo,
      })

      setMembers((prev) => [created, ...prev.filter((m) => m.memberId !== created.memberId)])
      setSelectedMemberId(created.memberId)
      setShowAddMember(false)
      setMemberForm(makeMemberForm())
      setCurrentView('members')
      pushToast('Member added successfully', 'success')

      if (isSupabaseReady && session) {
        const nextPayments = await dataService.getPaymentsFromSupabase()
        setPayments(nextPayments)
      }
    } catch (err) {
      pushToast('Failed to add member: ' + (err.message || 'Error occurred'), 'warning')
    }
  }

  const handleSettingSave = async (event) => {
    event.preventDefault()
    try {
      await dataService.saveSettingsToSupabase(settings)
      pushToast('Settings saved successfully', 'success')
    } catch (err) {
      pushToast('Failed to save settings: ' + err.message, 'warning')
    }
  }

  const renderStatusBadge = (value) => {
    const classNames = {
      Active: 'status-success',
      'Expiring Soon': 'status-warning',
      Expired: 'status-danger',
    }

    return <span className={`status-pill ${classNames[value] || ''}`}>{value}</span>
  }

  const renderDashboard = () => (
    <div className="page-shell">
      <div className="mode-banner">
        {appConfig.isMockMode ? 'Development mock mode • Safe local demo' : 'Production mode • Connected services'}
      </div>

      <header className="topbar">
        <div>
          <p className="eyebrow">Good evening, Owner</p>
          <h1>Here&apos;s what&apos;s happening at Guru Fitness today.</h1>
        </div>
      </header>

      <section className="stats-grid">
        <StatsCard label="Total Members" value={summary.totalMembers.toString()} accent="dark" />
        <StatsCard label="Active Members" value={summary.activeMembers.toString()} accent="green" />
        <StatsCard label="Today&apos;s Attendance" value={summary.todayAttendanceCount.toString()} accent="red" />
        <StatsCard label="Expiring Soon" value={summary.expiringSoonCount.toString()} accent="amber" />
      </section>

      <section className="quick-actions-row">
        <button type="button" className="primary-button" onClick={() => { setCurrentView('scan'); setScannerState({ type: 'idle' }) }}>
          Scan QR
        </button>
        <button type="button" className="secondary-button" onClick={() => setShowAddMember(true)}>
          Add Member
        </button>
        <button type="button" className="secondary-button" onClick={() => setCurrentView('scan')}>
          Today&apos;s Attendance
        </button>
      </section>

      <section className="split-grid">
        <div className="panel-card">
          <div className="panel-header-row">
            <h2>Today&apos;s Attendance</h2>
            <span className="muted-link">{summary.todayAttendanceCount} checked in</span>
          </div>
          <div className="attendance-list">
            {todayAttendance.slice(0, 5).map((person) => (
              <div key={person.memberId} className="attendance-row">
                <div className="name-stack">
                  <span className="person-name">{person.name}</span>
                  <span className="person-time">{person.time}</span>
                </div>
                <span className="status-pill status-success">Present</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header-row">
            <h2>Memberships Expiring</h2>
            <span className="muted-link">Upcoming</span>
          </div>
          <div className="expiring-list">
            {expiringSoon.map((member) => (
              <div key={member.memberId} className="expiring-row">
                <div className="name-stack">
                  <span className="person-name">{member.name}</span>
                  <span className="person-id">{member.memberId}</span>
                </div>
                <span className="date-tag">{formatDate(member.expiryDate)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )

  const renderScanPage = () => (
    <div className="page-shell scan-page">
      <header className="topbar compact-header">
        <div>
          <p className="eyebrow">Attendance workflow</p>
          <h1>Scan Member QR</h1>
        </div>
      </header>

      <div className="scanner-layout">
        <div className="scanner-panel">
          <div className="scanner-frame">
            <div className="scanner-overlay" />
            <div className="qr-corners">
              <span className="corner top-left" />
              <span className="corner top-right" />
              <span className="corner bottom-left" />
              <span className="corner bottom-right" />
            </div>
            <div className="scanner-graphic" aria-label="Demo QR scanner frame">
              <div className="qr-grid" aria-hidden="true">
                {Array.from({ length: 196 }).map((_, index) => (
                  <span
                    key={index}
                    className={`qr-cell ${index % 2 === 0 || index % 7 === 0 ? 'filled' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="scanner-labels">
            <h2>Scan Member QR Code</h2>
            <p>Ask the member to show their personal QR code.</p>
          </div>
        </div>

        <div className="scanner-side">
          <div className="demo-card">
            <p className="demo-title">Quick scan simulation</p>
            {members.slice(0, 3).map((m) => (
              <button
                key={m.memberId}
                type="button"
                className="secondary-button block"
                style={{ marginBottom: '0.5rem' }}
                onClick={() => handleDemoScan(m.memberId)}
              >
                Scan {m.name} ({m.memberId})
              </button>
            ))}
            {members.length === 0 && (
              <p className="muted-copy">No members registered yet. Add a member to test QR scanning.</p>
            )}
          </div>

          <div className="scan-result-card">
            {scannerState.type === 'idle' && (
              <>
                <p className="result-title">Ready for scan</p>
                <p className="muted-copy">The demo is waiting for a member QR simulation.</p>
              </>
            )}

            {scannerState.type === 'found' && (
              <>
                <p className="result-title">Member Found</p>
                <div className="profile-summary-row">
                  <Avatar name={scannerState.member.name} size="large" />
                  <div>
                    <h3>{scannerState.member.name}</h3>
                    <p>{scannerState.member.memberId}</p>
                    <p>{scannerState.member.phone}</p>
                  </div>
                </div>
                <div className="meta-list">
                  <span><strong>Membership:</strong> {scannerState.member.plan}</span>
                  <span><strong>Expires:</strong> {formatDate(scannerState.member.expiryDate)}</span>
                  <span><strong>Status:</strong> {getMembershipStatus(scannerState.member)}</span>
                </div>
                <p className="verify-text">Verify member before marking attendance</p>
                <button type="button" className="primary-button block" onClick={() => handleMarkAttendance(scannerState.member.memberId)}>
                  Mark Attendance
                </button>
              </>
            )}

            {scannerState.type === 'alreadyMarked' && (
              <>
                <p className="result-title danger-title">Already Marked</p>
                <div className="profile-summary-row">
                  <Avatar name={scannerState.member.name} size="large" />
                  <div>
                    <h3>{scannerState.member.name}</h3>
                    <p>{scannerState.member.memberId}</p>
                  </div>
                </div>
                <p className="muted-copy">{scannerState.member.name} is already marked present today.</p>
                <p className="attendance-time">Present since {scannerState.time}</p>
                <button type="button" className="secondary-button block" onClick={() => setScannerState({ type: 'idle' })}>
                  Back to Scanner
                </button>
              </>
            )}

            {scannerState.type === 'expired' && (
              <>
                <p className="result-title danger-title">Membership Expired</p>
                <div className="profile-summary-row">
                  <Avatar name={scannerState.member.name} size="large" />
                  <div>
                    <h3>{scannerState.member.name}</h3>
                    <p>{scannerState.member.memberId}</p>
                  </div>
                </div>
                <p className="expired-copy">Expired on: {formatDate(scannerState.member.expiryDate)}</p>
                <button type="button" className="primary-button block" onClick={() => openRenewalModal(scannerState.member)}>
                  Renew Membership
                </button>
                <button type="button" className="secondary-button block" onClick={() => setScannerState({ type: 'confirmExpiredAttendance', member: scannerState.member })}>
                  Allow Attendance Anyway
                </button>
              </>
            )}

            {scannerState.type === 'confirmExpiredAttendance' && (
              <>
                <p className="result-title warning-title">Membership is expired</p>
                <p className="muted-copy">Are you sure you want to allow attendance?</p>
                <div className="button-row split-row">
                  <button type="button" className="ghost-button" onClick={() => setScannerState({ type: 'idle' })}>
                    Cancel
                  </button>
                  <button type="button" className="primary-button" onClick={() => handleMarkAttendance(scannerState.member.memberId, true)}>
                    Allow Attendance
                  </button>
                </div>
              </>
            )}

            {scannerState.type === 'success' && (
              <>
                <p className="result-title success-title">✓ Attendance Marked</p>
                <h3>{scannerState.member.name}</h3>
                <p className="attendance-time">{scannerState.time}</p>
                <p className="muted-copy">Attendance successfully recorded for today.</p>
                <button type="button" className="secondary-button block" onClick={() => setScannerState({ type: 'idle' })}>
                  Back to Scanner
                </button>
              </>
            )}

            {scannerState.type === 'successWarning' && (
              <>
                <p className="result-title success-title">✓ Attendance Marked</p>
                <h3>{scannerState.member.name}</h3>
                <p className="attendance-time">{scannerState.time}</p>
                <p className="warning-copy">Membership expired</p>
                <button type="button" className="secondary-button block" onClick={() => setScannerState({ type: 'idle' })}>
                  Back to Scanner
                </button>
              </>
            )}

            {scannerState.type === 'renewed' && (
              <>
                <p className="result-title success-title">✓ Membership Renewed</p>
                <h3>{scannerState.member.name}</h3>
                <p className="muted-copy">{scannerState.member.name} is active until {formatDate(scannerState.newExpiry)}.</p>
                <button type="button" className="secondary-button block" onClick={() => setScannerState({ type: 'idle' })}>
                  Back to Scanner
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderMembersPage = () => (
    <div className="page-shell">
      <header className="topbar compact-header">
        <div>
          <p className="eyebrow">Member directory</p>
          <h1>Members</h1>
        </div>
        <button type="button" className="primary-button" onClick={() => setShowAddMember(true)}>
          Add Member
        </button>
      </header>

      <div className="member-toolbar">
        <label className="search-input">
          <span className="search-icon">⌕</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name or phone..."
            aria-label="Search members"
          />
        </label>

        <div className="filter-row">
          {filterOptions.map((option) => (
            <button
              type="button"
              key={option}
              className={`filter-chip ${memberFilter === option ? 'active' : ''}`}
              onClick={() => setMemberFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="member-list-grid">
        {filteredMembers.length > 0 ? (
          filteredMembers.map((member) => (
            <div key={member.memberId} className="member-card">
              <div className="member-card-top">
                <Avatar name={member.name} />
                <div className="member-info-block">
                  <h3>{member.name}</h3>
                  <p>{member.memberId}</p>
                </div>
                {renderStatusBadge(getMembershipStatus(member))}
              </div>
              <div className="member-metadata">
                <span>{member.phone}</span>
                <span>{member.plan}</span>
                <span>Expiry: {formatDate(member.expiryDate)}</span>
              </div>
              <button type="button" className="secondary-button full" onClick={() => setSelectedMemberId(member.memberId)}>
                View
              </button>
            </div>
          ))
        ) : (
          <div className="panel-card empty-state">
            <h3>No members match your current filter.</h3>
            <p>Try another search or reset the current filter to see all members.</p>
          </div>
        )}
      </div>

      {selectedMember && (
        <div className="profile-panel panel-card">
          <div className="profile-header">
            <Avatar name={selectedMember.name} size="large" />
            <div>
              <h2>{selectedMember.name}</h2>
              <p>{selectedMember.memberId}</p>
            </div>
            {renderStatusBadge(getMembershipStatus(selectedMember))}
          </div>

          <div className="profile-grid">
            <div className="info-block">
              <span className="info-label">Phone</span>
              <strong>{selectedMember.phone}</strong>
            </div>
            <div className="info-block">
              <span className="info-label">Membership</span>
              <strong>{selectedMember.plan}</strong>
            </div>
            <div className="info-block">
              <span className="info-label">Fee</span>
              <strong>{formatCurrency(selectedMember.fee)}</strong>
            </div>
            <div className="info-block">
              <span className="info-label">Start</span>
              <strong>{formatDate(selectedMember.startDate)}</strong>
            </div>
            <div className="info-block">
              <span className="info-label">Expiry</span>
              <strong>{formatDate(selectedMember.expiryDate)}</strong>
            </div>
            <div className="info-block">
              <span className="info-label">Today</span>
              <strong>
                {selectedMember.attendanceHistory.some((entry) => entry.date === TODAY_ISO)
                  ? 'Present Today'
                  : 'Not marked'}
              </strong>
            </div>
          </div>

          <div className="qr-box">
            <div className="qr-preview" aria-label={`QR code for ${selectedMember.memberId}`}>
              {Array.from({ length: 169 }).map((_, index) => (
                <span
                  key={index}
                  className={`qr-cell ${index % 4 === 0 || index % 9 === 0 || (index % 11 === 0 && index % 3 === 0) ? 'filled' : ''}`}
                />
              ))}
            </div>
            <div className="qr-text">
              <strong>Member QR</strong>
              <span>{selectedMember.memberId}</span>
            </div>
          </div>

          <div className="profile-actions">
            <button type="button" className="primary-button" onClick={() => handleMarkAttendance(selectedMember.memberId)}>
              Mark Attendance
            </button>
            <button type="button" className="secondary-button" onClick={() => openRenewalModal(selectedMember)}>
              Renew
            </button>
            <button type="button" className="secondary-button" onClick={() => setCurrentView('scan')}>
              Show QR
            </button>
          </div>

          <div className="history-grid">
            <div className="history-panel">
              <h3>Attendance History</h3>
              <div className="history-list">
                {selectedMember.attendanceHistory.slice(0, 4).map((entry, index) => (
                  <div key={`${selectedMember.memberId}-${entry.date}-${index}`} className="history-item">
                    <span>{formatDate(entry.date)}</span>
                    <span>{entry.time}</span>
                    <span>{entry.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="history-panel">
              <h3>Payment History</h3>
              <div className="history-list">
                {payments.slice(0, 4).map((entry, index) => (
                  <div key={`${entry.member}-${index}`} className="history-item">
                    <span>{formatDate(entry.date)}</span>
                    <span>{formatCurrency(entry.amount)}</span>
                    <span>{entry.method}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderMembershipsPage = () => (
    <div className="page-shell">
      <header className="topbar compact-header">
        <div>
          <p className="eyebrow">Plans and renewals</p>
          <h1>Memberships</h1>
        </div>
      </header>

      <section className="stats-grid mini-grid">
        <StatsCard label="Active" value={members.filter((member) => getMembershipStatus(member) === 'Active').length.toString()} accent="green" />
        <StatsCard label="Expiring Soon" value={members.filter((member) => getMembershipStatus(member) === 'Expiring Soon').length.toString()} accent="amber" />
        <StatsCard label="Expired" value={members.filter((member) => getMembershipStatus(member) === 'Expired').length.toString()} accent="red" />
        <StatsCard label="Monthly Plan" value={formatCurrency(settings.monthlyMembership)} accent="dark" />
      </section>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Plan</th>
              <th>Start</th>
              <th>Expiry</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {members.slice(0, 12).map((member) => (
              <tr key={member.memberId}>
                <td>
                  <div className="table-user">
                    <Avatar name={member.name} small />
                    <div>
                      <strong>{member.name}</strong>
                      <span>{member.memberId}</span>
                    </div>
                  </div>
                </td>
                <td>{member.plan}</td>
                <td>{formatDate(member.startDate)}</td>
                <td>{formatDate(member.expiryDate)}</td>
                <td>{renderStatusBadge(getMembershipStatus(member))}</td>
                <td>
                  <button type="button" className="secondary-button compact" onClick={() => openRenewalModal(member)}>
                    Renew
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderPaymentsPage = () => (
    <div className="page-shell">
      <header className="topbar compact-header">
        <div>
          <p className="eyebrow">Payment activity</p>
          <h1>Payments</h1>
        </div>
      </header>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Member</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Membership period</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length > 0 ? (
              payments.map((payment, index) => (
                <tr key={`${payment.member}-${index}`}>
                  <td>{formatDate(payment.date)}</td>
                  <td>{payment.member}</td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td>{payment.method}</td>
                  <td>{payment.period}</td>
                  <td>
                    <span className={`payment-status ${payment.status === 'Pending' ? 'pending' : 'paid'}`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">
                  <div className="table-empty-state">
                    No payment records yet.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderSettingsPage = () => (
    <div className="page-shell settings-page">
      <header className="topbar compact-header">
        <div>
          <p className="eyebrow">Business settings</p>
          <h1>Settings</h1>
        </div>
      </header>

      <form className="settings-form panel-card" onSubmit={handleSettingSave}>
        <div className="field-row two-up">
          <label>
            <span>Gym Name</span>
            <input
              type="text"
              value={settings.gymName}
              onChange={(event) => setSettings((prev) => ({ ...prev, gymName: event.target.value }))}
            />
          </label>
          <label>
            <span>Monthly Membership</span>
            <input
              type="number"
              value={settings.monthlyMembership}
              onChange={(event) => setSettings((prev) => ({ ...prev, monthlyMembership: Number(event.target.value) }))}
            />
          </label>
        </div>

        <div className="field-row two-up">
          <label>
            <span>Phone</span>
            <input
              type="tel"
              value={settings.phone}
              onChange={(event) => setSettings((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </label>
          <label>
            <span>City</span>
            <input
              type="text"
              value={settings.city}
              onChange={(event) => setSettings((prev) => ({ ...prev, city: event.target.value }))}
            />
          </label>
        </div>

        <label>
          <span>Address</span>
          <textarea
            rows="4"
            value={settings.address}
            onChange={(event) => setSettings((prev) => ({ ...prev, address: event.target.value }))}
          />
        </label>

        <div className="button-row right-align">
          <button type="submit" className="primary-button">Save Changes</button>
        </div>
      </form>
    </div>
  )

  const renderPage = () => {
    switch (currentView) {
      case 'scan':
        return renderScanPage()
      case 'members':
        return renderMembersPage()
      case 'memberships':
        return renderMembershipsPage()
      case 'payments':
        return renderPaymentsPage()
      case 'settings':
        return renderSettingsPage()
      case 'dashboard':
      default:
        return renderDashboard()
    }
  }

  if (!session && isSupabaseReady) {
    return (
      <AuthScreen
        isSupabaseReady={true}
        isLoading={authLoading}
        error={authError}
        onSubmit={handleLogin}
        onSignUp={handleSignUp}
        onDemoContinue={handleDemoContinue}
      />
    )
  }

  if (!session && !isSupabaseReady) {
    return (
      <AuthScreen
        isSupabaseReady={false}
        isLoading={authLoading}
        error={authError}
        onSubmit={handleLogin}
        onSignUp={handleSignUp}
        onDemoContinue={handleDemoContinue}
      />
    )
  }

  return (
    <div className="app-shell">
      <Sidebar navItems={visibleNavItems} currentView={currentView} onNavigate={setCurrentView} />

      <main className="main-panel">
        {renderPage()}
      </main>

      <div className="session-toolbar">
        <span className="session-user">{session?.user?.email || 'Demo session'}</span>
        <button type="button" className="secondary-button compact" onClick={handleLogout}>Logout</button>
      </div>

      {showAddMember && (
        <div className="modal-backdrop" onClick={() => setShowAddMember(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Member</h2>
              <button type="button" className="close-button" onClick={() => setShowAddMember(false)}>×</button>
            </div>

            <form onSubmit={handleAddMember} className="member-form">
              <div className="field-row two-up">
                <label>
                  <span>Full Name</span>
                  <input
                    type="text"
                    value={memberForm.fullName}
                    onChange={(event) => setMemberForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>Phone Number</span>
                  <input
                    type="tel"
                    value={memberForm.phone}
                    onChange={(event) => setMemberForm((prev) => ({ ...prev, phone: event.target.value }))}
                    required
                  />
                </label>
              </div>

              <div className="field-row two-up">
                <label>
                  <span>Member ID</span>
                  <input
                    type="text"
                    value={memberForm.memberId}
                    onChange={(event) => setMemberForm((prev) => ({ ...prev, memberId: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Membership Plan</span>
                  <select
                    value={memberForm.plan}
                    onChange={(event) => setMemberForm((prev) => ({ ...prev, plan: event.target.value }))}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </label>
              </div>

              <div className="field-row two-up">
                <label>
                  <span>Monthly Fee</span>
                  <input
                    type="number"
                    value={memberForm.fee}
                    onChange={(event) => setMemberForm((prev) => ({ ...prev, fee: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Payment Method</span>
                  <select
                    value={memberForm.paymentMethod}
                    onChange={(event) => setMemberForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                  </select>
                </label>
              </div>

              <div className="field-row two-up">
                <label>
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={toDateInputValue(memberForm.startDate)}
                    onChange={(event) => setMemberForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Expiry Date</span>
                  <input
                    type="date"
                    value={toDateInputValue(memberForm.expiryDate)}
                    onChange={(event) => setMemberForm((prev) => ({ ...prev, expiryDate: event.target.value }))}
                  />
                </label>
              </div>

              <label>
                <span>Photo</span>
                <input
                  type="text"
                  value={memberForm.photo}
                  onChange={(event) => setMemberForm((prev) => ({ ...prev, photo: event.target.value }))}
                  placeholder="Optional photo URL"
                />
              </label>

              <div className="button-row right-align">
                <button type="button" className="ghost-button" onClick={() => setShowAddMember(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRenewModal && (
        <div className="modal-backdrop" onClick={() => setShowRenewModal(false)}>
          <div className="modal-card small-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Renew Membership</h2>
              <button type="button" className="close-button" onClick={() => setShowRenewModal(false)}>×</button>
            </div>

            {renewMemberId && (
              <div className="renew-detail">
                <p><strong>Member:</strong> {members.find((member) => member.memberId === renewMemberId)?.name}</p>
                <p><strong>Current expiry:</strong> {formatDate(members.find((member) => member.memberId === renewMemberId)?.expiryDate || '2026-10-05')}</p>
                <label>
                  <span>New expiry</span>
                  <input
                    type="date"
                    value={renewalForm.expiryDate}
                    onChange={(event) => setRenewalForm((prev) => ({ ...prev, expiryDate: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Amount</span>
                  <input
                    type="number"
                    value={renewalForm.amount}
                    onChange={(event) => setRenewalForm((prev) => ({ ...prev, amount: Number(event.target.value) }))}
                  />
                </label>
              </div>
            )}

            <div className="button-row right-align">
              <button type="button" className="ghost-button" onClick={() => setShowRenewModal(false)}>
                Cancel
              </button>
              <button type="button" className="primary-button" onClick={confirmRenewal}>
                Confirm Renewal
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastList toasts={toasts} />
    </div>
  )
}

export default App

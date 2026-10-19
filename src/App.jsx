import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Activity, ArrowUpRight, CalendarCheck2, CalendarDays, CheckCircle2, CircleDollarSign, CreditCard, LoaderCircle, ScanLine, UserRoundPlus, UsersRound, WalletCards, X, XCircle } from 'lucide-react'
import './App.css'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Members from './components/Members'
import Attendance from './components/Attendance'
import Payments from './components/Payments'
import Settings from './components/Settings'
import StatsCard from './components/StatsCard'
import Avatar from './components/Avatar'
import ToastList from './components/ToastList'
import AuthScreen from './components/AuthScreen'
import CheckInView from './components/CheckInView'
import MemberPhoto from './components/MemberPhoto'
import MemberPortal from './components/MemberPortal'
import GymLeaderboard from './components/GymLeaderboard'
import PeakHoursHeatmap from './components/PeakHoursHeatmap'
import ChurnRadar from './components/ChurnRadar'
import FloatingAIChat from './components/FloatingAIChat'
import ExerciseDetail from './pages/ExerciseDetail'
import ExerciseLibrary from './pages/ExerciseLibrary'
import useQRScanner from './hooks/useQRScanner'
import { appConfig } from './config/appConfig'
import { dataService } from './services/dataService'
import { isSupportedMemberPhoto, MAX_MEMBER_PHOTO_BYTES } from './services/memberPhotoService'
import { sendWhatsAppNotification } from './services/whatsappNotificationService'
import {
  ensureCurrentUserProfile,
  getCurrentSession,
  isSupabaseReady,
  supabase,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOut,
} from './services/supabaseService'
import {
  computeSummary,
  formatCurrency,
  formatDate,
  getExpiringSoonMembers,
  getMemberTodayAttendance,
  getMembershipStatus,
  getTodayAttendance,
  getTodayIsoKolkata,
  toDateInputValue,
} from './utils/gymLogic'

const QRCodeCard = lazy(() => import('./components/QRCodeCard'))

const MEMBER_PAGE_SIZE = 24
const PAYMENT_PAGE_SIZE = 50

const navItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'attendance', label: "Today's Attendance" },
  { key: 'members', label: 'Members' },
  { key: 'memberships', label: 'Memberships' },
  { key: 'payments', label: 'Payments' },
  { key: 'settings', label: 'Settings' },
  { key: 'exercises', label: 'Exercise library' },
]

const filterOptions = ['All', 'Active', 'Expiring Soon', 'Expired']

let toastCounter = 0
const getNextToastId = () => {
  toastCounter += 1
  return `toast-${toastCounter}`
}

const selectMemberPhoto = (event, setSelection, setError, pushToast) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!isSupportedMemberPhoto(file)) {
    const message = !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      ? 'Choose a JPG, PNG, or WEBP profile photograph.'
      : `Profile photographs must be ${MAX_MEMBER_PHOTO_BYTES / (1024 * 1024)} MB or smaller.`
    setSelection((previous) => {
      if (previous.previewUrl) URL.revokeObjectURL(previous.previewUrl)
      return { file: null, previewUrl: '' }
    })
    setError(message)
    pushToast(message, 'warning')
    return
  }

  const previewUrl = URL.createObjectURL(file)
  setSelection((previous) => {
    if (previous.previewUrl) URL.revokeObjectURL(previous.previewUrl)
    return { file, previewUrl }
  })
  setError('')
}

const getFormattedCurrentTime = () => {
  // Format in the gym's timezone so the optimistic check-in label matches the
  // time persisted by the server regardless of the device's timezone setting.
  const [rawHours, mins] = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  })
    .format(new Date())
    .split(':')

  const hours = Number(rawHours) % 24
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const dispHour = hours % 12 || 12
  return `${dispHour}:${mins} ${ampm}`
}

const addDaysToIso = (dateValue, days) => {
  const date = new Date(`${dateValue || getTodayIsoKolkata()}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + Number(days || 0))
  return date.toISOString().slice(0, 10)
}

const getPlanExpiryDate = (plan, startDate = getTodayIsoKolkata()) => {
  const durationDays = Number(plan?.duration_days || 30)
  return addDaysToIso(startDate, durationDays)
}

const makeMemberForm = (plan = null) => {
  const startDate = getTodayIsoKolkata()
  return {
    fullName: '',
    phone: '',
    memberId: '',
    planId: plan?.id || '',
    plan: plan?.name || '',
    fee: plan ? String(Number(plan.price || 0)) : '',
    startDate,
    expiryDate: plan ? getPlanExpiryDate(plan, startDate) : startDate,
    paymentMethod: 'cash',
    photo: '',
  }
}

function DashboardApp() {
  const isMemberPortalRoute = window.location.pathname.replace(/\/+$/, '') === '/member'
  const [members, setMembers] = useState(() => (isSupabaseReady ? [] : dataService.getMembers()))
  const [payments, setPayments] = useState(() => (isSupabaseReady ? [] : dataService.getPayments()))
  const [ledgerSummary, setLedgerSummary] = useState(null)
  const [settings, setSettings] = useState(() => (isSupabaseReady ? { gymName: 'Guru Fitness Health Club', monthlyMembership: 500, phone: '+91 98765 43210', city: 'Dhule', address: 'Dhule, Maharashtra, India' } : dataService.getSettings()))
  const [membershipPlans, setMembershipPlans] = useState([])
  const [activeTab, setActiveTabState] = useState('dashboard')
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [memberFilter, setMemberFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [membersPage, setMembersPage] = useState(1)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showEditMember, setShowEditMember] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [renewMemberId, setRenewMemberId] = useState(null)
  const [editMemberId, setEditMemberId] = useState(null)
  const [checkInState, setCheckInState] = useState({ type: 'idle' })
  const [scanResult, setScanResult] = useState(null)
  const [toasts, setToasts] = useState([])
  const [memberForm, setMemberForm] = useState(makeMemberForm())
  const [editMemberForm, setEditMemberForm] = useState({ fullName: '', phone: '', photo: '' })
  const [renewalForm, setRenewalForm] = useState({
    amount: 500,
    expiryDate: getTodayIsoKolkata(),
    planId: null,
  })
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(() => isSupabaseReady)
  const [dashboardClock] = useState(() => new Date())
  const [authError, setAuthError] = useState('')
  const [isLoadingLiveData, setIsLoadingLiveData] = useState(false)
  const [liveDataError, setLiveDataError] = useState('')
  const [liveDataRetryToken, setLiveDataRetryToken] = useState(0)
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false)
  const [isSubmittingMember, setIsSubmittingMember] = useState(false)
  const [isSavingMember, setIsSavingMember] = useState(false)
  const [isSendingWhatsAppReminder, setIsSendingWhatsAppReminder] = useState(false)
  const [isRenewingMembership, setIsRenewingMembership] = useState(false)
  const [memberPhotoSelection, setMemberPhotoSelection] = useState({ file: null, previewUrl: '' })
  const [editPhotoSelection, setEditPhotoSelection] = useState({ file: null, previewUrl: '' })
  const [memberPhotoError, setMemberPhotoError] = useState('')
  const [editMemberError, setEditMemberError] = useState('')
  const [removeEditPhoto, setRemoveEditPhoto] = useState(false)
  const [showWhatsAppActions, setShowWhatsAppActions] = useState(false)
  const [isCheckingWhatsApp, setIsCheckingWhatsApp] = useState(false)
  const [sendingWhatsAppEvent, setSendingWhatsAppEvent] = useState('')
  const [memberProfileTab, setMemberProfileTab] = useState('Overview')
  const [memberActivityState, setMemberActivityState] = useState({ memberId: null, rows: [] })
  const [memberAttendanceState, setMemberAttendanceState] = useState({ memberId: null, rows: [], error: '' })
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isRecordingPayment, setIsRecordingPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ memberCode: '', amount: '', paymentMethod: 'cash', paymentDate: getTodayIsoKolkata(), notes: '' })
  const qrScanSequenceRef = useRef(0)

  const currentView = activeTab === 'attendance' ? 'scan' : activeTab
  const setActiveTab = (tab) => {
    setActiveTabState(tab === 'scan' ? 'attendance' : tab)
    if (tab === 'scan' || tab === 'attendance') {
      setCheckInState({ type: 'idle' })
    }
  }
  const setCurrentView = setActiveTab

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
    if (!session || !isSupabaseReady || isMemberPortalRoute) return

    const loadLiveDatabase = async () => {
      setIsLoadingLiveData(true)
      setLiveDataError('')
      try {
        const [sbMembers, sbPayments, sbSettings, sbPlans, sbLedgerSummary] = await Promise.all([
          dataService.getMembersFromSupabase(),
          dataService.getPaymentsFromSupabase(),
          dataService.getSettingsFromSupabase(),
          dataService.getMembershipPlans(),
          dataService.getLedgerSummaryFromSupabase(),
        ])

        if (Array.isArray(sbMembers)) {
          setMembers(sbMembers)
          if (sbMembers.length > 0) {
            setSelectedMemberId(sbMembers[0].memberId)
          }
        }
        if (Array.isArray(sbPayments)) {
          setPayments(sbPayments)
        }
        setLedgerSummary(sbLedgerSummary)
        if (sbSettings) {
          setSettings(sbSettings)
        }
        if (Array.isArray(sbPlans)) {
          setMembershipPlans(sbPlans)
          setMemberForm((prev) => {
            const nextPlan = prev.planId ? sbPlans.find((plan) => plan.id === prev.planId) : sbPlans[0]
            if (!nextPlan) return prev
            const startDate = prev.startDate || getTodayIsoKolkata()
            const nextExpiry = prev.expiryDate && prev.expiryDate !== startDate
              ? prev.expiryDate
              : getPlanExpiryDate(nextPlan, startDate)

            return {
              ...prev,
              planId: nextPlan.id,
              plan: nextPlan.name,
              fee: String(prev.fee && Number(prev.fee) > 0 ? prev.fee : Number(nextPlan.price || 0)),
              startDate,
              expiryDate: nextExpiry,
            }
          })
        }
      } catch (err) {
        console.warn('Error loading live Supabase data:', err)
        // Surface load failures — an empty dashboard must never be mistaken
        // for "no data" when the real cause is a failed/permission-denied fetch.
        setLiveDataError(err?.message || 'Unknown error while fetching live data.')
      } finally {
        setIsLoadingLiveData(false)
      }
    }

    loadLiveDatabase()
  }, [session, liveDataRetryToken, isMemberPortalRoute])


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

  const visibleMembers = useMemo(() => members.filter((member) => member.status !== 'archived'), [members])
  const selectedMember = visibleMembers.find((member) => member.memberId === selectedMemberId) || visibleMembers[0]

  const selectedPlan = membershipPlans.find((plan) => plan.id === memberForm.planId) || membershipPlans[0] || null
  const memberActivityRows = memberActivityState.memberId === selectedMember?.id ? memberActivityState.rows : []
  const isLoadingMemberActivity = memberProfileTab === 'Activity' && Boolean(selectedMember?.id) && memberActivityState.memberId !== selectedMember.id
  const memberAttendanceRows = !isSupabaseReady
    ? selectedMember?.attendanceHistory || []
    : memberAttendanceState.memberId === selectedMember?.id
      ? memberAttendanceState.rows
      : selectedMember?.attendanceHistory || []
  const isLoadingMemberAttendance = isSupabaseReady && memberProfileTab === 'Attendance'
    && Boolean(selectedMember?.id)
    && memberAttendanceState.memberId !== selectedMember.id
  const memberPaymentRows = useMemo(
    () => payments.filter((entry) => entry.memberCode === selectedMember?.memberId),
    [payments, selectedMember?.memberId],
  )

  const selectMember = (memberCode) => {
    setSelectedMemberId(memberCode)
    setMemberProfileTab('Overview')
  }

  useEffect(() => {
    if (memberProfileTab !== 'Activity' || !selectedMember?.id) return
    let cancelled = false
    dataService.getMemberActivity(selectedMember.id)
      .then((rows) => {
        if (!cancelled) setMemberActivityState({ memberId: selectedMember.id, rows })
      })
      .catch(() => {
        if (!cancelled) setMemberActivityState({ memberId: selectedMember.id, rows: [] })
      })
    return () => { cancelled = true }
  }, [memberProfileTab, selectedMember?.id])

  useEffect(() => {
    if (!isSupabaseReady || memberProfileTab !== 'Attendance' || !selectedMember?.id) return
    let cancelled = false
    dataService.getMemberAttendanceHistory(selectedMember.id)
      .then((rows) => {
        if (!cancelled) setMemberAttendanceState({ memberId: selectedMember.id, rows, error: '' })
      })
      .catch((error) => {
        if (!cancelled) {
          setMemberAttendanceState({
            memberId: selectedMember.id,
            rows: [],
            error: error.message || 'Unable to load attendance history.',
          })
        }
      })
    return () => { cancelled = true }
  }, [memberProfileTab, selectedMember?.id])

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

  const handleGoogleSignIn = async () => {
    setAuthLoading(true)
    setAuthError('')
    try {
      await signInWithGoogle()
    } catch (error) {
      setAuthError(error.message || 'Unable to sign in with Google. Please try again.')
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

  const summary = useMemo(() => computeSummary(visibleMembers), [visibleMembers])
  const todayAttendance = useMemo(() => getTodayAttendance(visibleMembers), [visibleMembers])
  const activeMembers = useMemo(
    () => visibleMembers.filter((member) => getMembershipStatus(member) === 'Active'),
    [visibleMembers],
  )
  const expiringSoon = useMemo(() => getExpiringSoonMembers(visibleMembers), [visibleMembers])
  const todayIso = getTodayIsoKolkata()
  const paidRevenueByDate = useMemo(() => {
    const totals = new Map()
    payments.forEach((payment) => {
      if (payment.status === 'Paid') {
        totals.set(payment.date, (totals.get(payment.date) || 0) + Number(payment.amount || 0))
      }
    })
    return totals
  }, [payments])
  const todayRevenue = paidRevenueByDate.get(todayIso) || 0
  const weeklyRevenue = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${todayIso}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() - (6 - index))
    const isoDate = date.toISOString().slice(0, 10)
    return {
      date: isoDate,
      label: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date),
      amount: paidRevenueByDate.get(isoDate) || 0,
    }
  }), [paidRevenueByDate, todayIso])

  const filteredMembers = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase()

    return visibleMembers.filter((member) => {
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
  }, [memberFilter, visibleMembers, searchQuery])
  const membersPageCount = Math.max(1, Math.ceil(filteredMembers.length / MEMBER_PAGE_SIZE))
  const currentMembersPage = Math.min(membersPage, membersPageCount)
  const pagedMembers = filteredMembers.slice(
    (currentMembersPage - 1) * MEMBER_PAGE_SIZE,
    currentMembersPage * MEMBER_PAGE_SIZE,
  )

  const paymentsPageCount = Math.max(1, Math.ceil(payments.length / PAYMENT_PAGE_SIZE))
  const currentPaymentsPage = Math.min(paymentsPage, paymentsPageCount)
  const pagedPayments = payments.slice(
    (currentPaymentsPage - 1) * PAYMENT_PAGE_SIZE,
    currentPaymentsPage * PAYMENT_PAGE_SIZE,
  )

  const membershipCounts = useMemo(() => visibleMembers.reduce((counts, member) => {
    const status = getMembershipStatus(member)
    if (status === 'Active') counts.active += 1
    if (status === 'Expiring Soon') counts.expiringSoon += 1
    if (status === 'Expired') counts.expired += 1
    return counts
  }, { active: 0, expiringSoon: 0, expired: 0 }), [visibleMembers])

  const pushToast = (message, type = 'success') => {
    const id = getNextToastId()
    setToasts((prev) => [...prev, { id, message, type }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 2600)
  }

  const handleMarkAttendance = async (memberId, allowExpired = false, { navigateToCheckIn = true } = {}) => {
    if (isMarkingAttendance) return { success: false, reason: 'Attendance is already being recorded.' }

    const member = members.find((entry) => entry.memberId === memberId)
    if (!member) return { success: false, reason: 'Member is not available in the current gym data.' }

    // Resolve the current date at call time (not module load) so a tab left
    // open past midnight still marks attendance against today's date.
    const todayIso = getTodayIsoKolkata()

    const alreadyMarked = member.attendanceHistory.some(
      (entry) => entry.date === todayIso && entry.status === 'Present',
    )

    if (alreadyMarked) {
      const todayEntry = member.attendanceHistory.find((entry) => entry.date === todayIso)
      const nextState = { type: 'alreadyMarked', member, time: todayEntry?.time || '—' }
      setCheckInState(nextState)
      pushToast('Already Present Today', 'warning')
      return { success: true, alreadyMarked: true, time: todayEntry?.time || '—' }
    }

    setIsMarkingAttendance(true)
    const timeValue = getFormattedCurrentTime()
    selectMember(memberId)
    if (navigateToCheckIn) setCurrentView('scan')

    // Optimistically add the attendance entry so the UI reflects the check-in immediately.
    const rollbackMembers = members
    const optimisticMembers = members.map((entry) => {
      if (entry.memberId !== memberId) return entry
      return {
        ...entry,
        attendanceHistory: [{ date: todayIso, time: timeValue, status: 'Present' }, ...entry.attendanceHistory],
      }
    })
    setMembers(optimisticMembers)

    try {
      const attendanceResult = await dataService.recordAttendance(memberId, allowExpired ? 'manual_override' : 'present')

      if (attendanceResult?.alreadyMarked) {
        // A duplicate was detected server-side — roll back the optimistic entry and
        // show the original check-in time preserved in the database row.
        setMembers(rollbackMembers)
        const originalTime = attendanceResult.originalTime || attendanceResult.time || timeValue
        const nextState = { type: 'alreadyMarked', member, time: originalTime }
        setCheckInState(nextState)
        pushToast('Already Present Today', 'warning')
        return { success: true, alreadyMarked: true, time: originalTime }
      }

      if (allowExpired) {
        const nextState = {
          type: 'successWarning',
          member: optimisticMembers.find((entry) => entry.memberId === memberId),
          time: attendanceResult?.time || timeValue,
          warning: 'Membership expired',
        }
        setCheckInState(nextState)
        pushToast('Attendance marked with expired warning', 'warning')
        return { success: true, warning: 'Membership expired' }
      }

      const nextState = {
        type: 'success',
        member: optimisticMembers.find((entry) => entry.memberId === memberId),
        time: attendanceResult?.time || timeValue,
      }
      setCheckInState(nextState)
      pushToast('Attendance marked', 'success')
      return { success: true, time: attendanceResult?.time || timeValue }
    } catch (err) {
      // Roll back the optimistic attendance entry on any error.
      setMembers(rollbackMembers)
      console.warn('Attendance DB sync warning:', err)
      const nextState = { type: 'idle' }
      setCheckInState(nextState)
      pushToast('Unable to mark attendance', 'warning')
      return { success: false, reason: err?.message || 'Unable to record attendance.' }
    } finally {
      setIsMarkingAttendance(false)
    }
  }

  const handleQRScan = async (memberCode) => {
    const scanId = ++qrScanSequenceRef.current
    setScanResult({ id: scanId, status: 'loading', code: memberCode })

    if (!isSupabaseReady || !session) {
      setScanResult({ id: scanId, status: 'error', code: memberCode, reason: 'A live, authenticated gym connection is required.' })
      return
    }

    try {
      const member = await dataService.getMemberByQrToken(memberCode)
      if (scanId !== qrScanSequenceRef.current) return
      if (!member) {
        setScanResult({ id: scanId, status: 'denied', code: memberCode, reason: 'Member record not found.' })
        return
      }

      const membershipStatus = getMembershipStatus(member)
      if (membershipStatus === 'Expired') {
        setScanResult({
          id: scanId,
          status: 'denied',
          member,
          reason: `Membership expired on ${formatDate(member.expiryDate)}.`,
        })
        return
      }

      const attendanceResult = await handleMarkAttendance(member.memberId, false, { navigateToCheckIn: false })
      if (scanId !== qrScanSequenceRef.current) return
      if (!attendanceResult?.success) {
        setScanResult({
          id: scanId,
          status: 'error',
          member,
          reason: attendanceResult?.reason || 'Attendance could not be recorded.',
        })
        return
      }

      setScanResult({
        id: scanId,
        status: 'granted',
        member,
        message: attendanceResult.alreadyMarked
          ? `Already checked in today${attendanceResult.time ? ` at ${attendanceResult.time}` : ''}.`
          : 'Attendance recorded successfully.',
      })

      if (!attendanceResult.alreadyMarked) {
        const memberCode = member.memberCode || member.memberId
        void (async () => {
          let streak = null
          try {
            const { data, error } = await supabase.rpc('calculate_attendance_streak', {
              p_member_id: member.id,
            })
            if (error) throw error
            streak = data
          } catch (error) {
            console.warn('Could not calculate attendance streak:', error)
          }

          try {
            await sendWhatsAppNotification(memberCode, 'attendance_logged', { streak })
          } catch (error) {
            console.warn('Could not send attendance WhatsApp notification:', error)
          }
        })()
      }
    } catch (error) {
      if (scanId !== qrScanSequenceRef.current) return
      setScanResult({
        id: scanId,
        status: 'error',
        code: memberCode,
        reason: error?.message || 'Could not verify this member. Please try again.',
      })
    }
  }

  useQRScanner(handleQRScan, {
    enabled: Boolean(!isMemberPortalRoute && session && !authLoading && !isLoadingLiveData && currentView === 'dashboard'),
  })

  useEffect(() => {
    if (!scanResult || scanResult.status === 'loading') return undefined
    const timeoutId = window.setTimeout(() => {
      setScanResult((current) => current?.id === scanResult.id ? null : current)
    }, 4000)
    return () => window.clearTimeout(timeoutId)
  }, [scanResult])

  const openRenewalModal = (member) => {
    const plan = membershipPlans.find((item) => item.id === member.planId || item.name === member.plan)
    const renewalStartDate = member.expiryDate > getTodayIsoKolkata() ? member.expiryDate : getTodayIsoKolkata()
    setRenewMemberId(member.memberId)
    setRenewalForm({
      amount: Number(plan?.price ?? member.fee),
      expiryDate: plan ? getPlanExpiryDate(plan, renewalStartDate) : member.expiryDate,
      planId: plan?.id || null,
    })
    setShowRenewModal(true)
  }

  const confirmRenewal = async () => {
    if (!renewMemberId || isRenewingMembership) return

    setIsRenewingMembership(true)
    try {
      await dataService.renewMembership(renewMemberId, {
        amount: renewalForm.amount,
        expiryDate: renewalForm.expiryDate,
        planId: renewalForm.planId,
      })

      if (isSupabaseReady && session) {
        const [nextMembers, nextPayments] = await Promise.all([
          dataService.getMembersFromSupabase(),
          dataService.getPaymentsFromSupabase(),
        ])
        setMembers(nextMembers)
        setPayments(nextPayments)
      } else {
        setMembers((prev) => prev.map((member) => {
          if (member.memberId !== renewMemberId) return member
          return { ...member, expiryDate: renewalForm.expiryDate, fee: renewalForm.amount }
        }))
      }

      selectMember(renewMemberId)
      setShowRenewModal(false)
      pushToast('Membership renewed', 'success')
    } catch (err) {
      // Refresh from the database after a failure so the UI always reflects
      // the real persisted state (rollback or partial write).
      if (isSupabaseReady && session) {
        try {
          const [nextMembers, nextPayments] = await Promise.all([
            dataService.getMembersFromSupabase(),
            dataService.getPaymentsFromSupabase(),
          ])
          setMembers(nextMembers)
          setPayments(nextPayments)
        } catch {
          // Keep the current view if the refresh also fails.
        }
      }
      pushToast(err.message || 'Failed to renew membership.', 'warning')
    } finally {
      setIsRenewingMembership(false)
    }
  }

  const handleCodeSubmit = async (code) => {
    try {
      const member = await dataService.getMemberByCode(code)

      if (!member) {
        const nextState = { type: 'notFound', code, pendingCode: code }
        setCheckInState(nextState)
        return
      }

      const todayEntry = getMemberTodayAttendance(member)
      if (todayEntry) {
        const nextState = { type: 'alreadyMarked', member, time: todayEntry.time || '—', code, pendingCode: code }
        setCheckInState(nextState)
        return
      }

      if (getMembershipStatus(member) === 'Expired') {
        const nextState = { type: 'expired', member, code, pendingCode: code }
        setCheckInState(nextState)
        return
      }

      const nextState = { type: 'ready', member, code, pendingCode: code }
      setCheckInState(nextState)
    } catch {
      const nextState = { type: 'notFound', code, pendingCode: code }
      setCheckInState(nextState)
      pushToast('Unable to look up member', 'warning')
    }
  }

  const openAddMember = () => {
    setMemberPhotoError('')
    setMemberPhotoSelection((previous) => {
      if (previous.previewUrl) URL.revokeObjectURL(previous.previewUrl)
      return { file: null, previewUrl: '' }
    })
    setShowAddMember(true)
  }

  const handleAddMember = async (event) => {
    event.preventDefault()
    if (isSubmittingMember) return
    if (!memberPhotoSelection.file) {
      const message = 'Choose a profile photograph before registering this member.'
      setMemberPhotoError(message)
      pushToast(message, 'warning')
      return
    }

    try {
      setIsSubmittingMember(true)
      setMemberPhotoError('')

      const resolvedPlan = membershipPlans.find((plan) => plan.id === memberForm.planId) || selectedPlan || null
      const startDate = memberForm.startDate || getTodayIsoKolkata()
      const resolvedExpiryDate = memberForm.expiryDate && memberForm.expiryDate !== startDate
        ? memberForm.expiryDate
        : (resolvedPlan ? getPlanExpiryDate(resolvedPlan, startDate) : startDate)

      const created = await dataService.createMember({
        fullName: memberForm.fullName,
        phone: memberForm.phone,
        memberId: memberForm.memberId,
        memberCode: memberForm.memberId,
        planId: memberForm.planId || resolvedPlan?.id || null,
        plan: resolvedPlan?.name || memberForm.plan,
        fee: Number(memberForm.fee || resolvedPlan?.price || 0),
        startDate,
        expiryDate: resolvedExpiryDate,
        paymentMethod: memberForm.paymentMethod,
        photoFile: memberPhotoSelection.file,
        paymentMade: true,
      })

      if (isSupabaseReady && session) {
        const [nextMembers, nextPayments] = await Promise.all([
          dataService.getMembersFromSupabase(),
          dataService.getPaymentsFromSupabase(),
        ])
        setMembers(nextMembers)
        setPayments(nextPayments)
      } else {
        setMembers((prev) => [created, ...prev.filter((m) => m.memberId !== created.memberId)])
      }

      selectMember(created.memberId)
      setShowAddMember(false)
      setMemberForm(makeMemberForm())
      setMemberPhotoSelection((previous) => {
        if (previous.previewUrl) URL.revokeObjectURL(previous.previewUrl)
        return { file: null, previewUrl: '' }
      })
      setCurrentView('members')
      pushToast('Member added successfully', 'success')
    } catch (err) {
      const message = err.message || 'Failed to add member.'
      setMemberPhotoError(message)
      pushToast(message, 'warning')
    } finally {
      setIsSubmittingMember(false)
    }
  }

  const openEditMember = (member) => {
    if (!member) return
    setEditMemberError('')
    setRemoveEditPhoto(false)
    setEditMemberId(member.id || member.memberId)
    setEditMemberForm({
      fullName: member.name,
      phone: member.phone,
      photo: member.photo || '',
    })
    setEditPhotoSelection((previous) => {
      if (previous.previewUrl) URL.revokeObjectURL(previous.previewUrl)
      return { file: null, previewUrl: '' }
    })
    setShowEditMember(true)
  }

  const handleEditMember = async (event) => {
    event.preventDefault()
    if (!editMemberId || isSavingMember) return

    setIsSavingMember(true)
    setEditMemberError('')
    try {
      const updated = await dataService.editMember(editMemberId, {
        full_name: editMemberForm.fullName,
        phone: editMemberForm.phone,
        photoFile: editPhotoSelection.file,
        removePhoto: removeEditPhoto,
      })

      if (removeEditPhoto) {
        pushToast('Member photo removed', 'success')
      }

      if (updated) {
        setMembers((prev) => prev.map((member) => (member.id === updated.id ? updated : member)))
        selectMember(updated.memberId)
      }

      setShowEditMember(false)
      setEditPhotoSelection((previous) => {
        if (previous.previewUrl) URL.revokeObjectURL(previous.previewUrl)
        return { file: null, previewUrl: '' }
      })
      pushToast('Member updated successfully', 'success')
    } catch (err) {
      const message = err.message || 'Failed to update member.'
      setEditMemberError(message)
      pushToast(message, 'warning')
    } finally {
      setIsSavingMember(false)
    }
  }

  const normalizeIndianPhone = (phone) => {
    if (!phone) return ''
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 10) return `91${digits}`
    if (digits.length === 12 && digits.startsWith('91')) return digits
    return digits
  }

  const whatsappUrl = (phone, text) => {
    const normalized = normalizeIndianPhone(phone)
    if (!normalized) return '#'
    const encodedText = encodeURIComponent(text)
    return `https://wa.me/${normalized}?text=${encodedText}`
  }

  const openWhatsAppActions = async () => {
    setShowWhatsAppActions(true)
    setIsCheckingWhatsApp(true)
    setIsWhatsAppConfigured(false)
    try {
      if (!selectedMember || !selectedMember.phone) {
        setIsWhatsAppConfigured(false)
        pushToast('Member phone number is required for WhatsApp.', 'warning')
        return
      }
      setIsWhatsAppConfigured(true)
    } finally {
      setIsCheckingWhatsApp(false)
    }
  }

  const handleWhatsAppAction = async (eventType) => {
    if (!selectedMember || !selectedMember.phone || sendingWhatsAppEvent) return
    setSendingWhatsAppEvent(eventType)

    let message = ''

    switch (eventType) {
      case 'membership_renewal_reminder':
        message = `Hello ${selectedMember.name || ''}, this is a reminder that your membership is expiring soon. Please renew at your earliest convenience. - Guru Fitness OS`
        break
      case 'payment_acknowledgement':
        message = `Hello ${selectedMember.name || ''}, thank you for your payment of ₹${selectedMember.fee || ''}. Your membership is active. - Guru Fitness OS`
        break
      case 'attendance_general':
        message = `Hello ${selectedMember.name || ''}, hello from Guru Fitness OS. How can we assist you today?`
        break
      case 'membership_renewed':
        message = `Hello ${selectedMember.name || ''}, your membership has been renewed. Active until ${formatDate(selectedMember.expiryDate || '')}. - Guru Fitness OS`
        break
      case 'payment_receipt':
        message = `Hello ${selectedMember.name || ''}, receipt ${selectedMember.memberId || ''} for ₹${selectedMember.fee || ''}. Thank you! - Guru Fitness OS`
        break
      default:
        message = ''
    }

    const url = whatsappUrl(selectedMember.phone, message)
    const whatsAppWindow = window.open(url, '_blank')
    if (whatsAppWindow) {
      pushToast(`WhatsApp opened${message ? ' with pre-filled message' : ''}`, 'info')
    } else {
      pushToast('Popup blocked. Please allow popups for this site.', 'warning')
    }
    setSendingWhatsAppEvent('')
  }

  const handleSendWhatsApp = async (member) => {
    if (!member || isSendingWhatsAppReminder) return
    if (!isSupabaseReady || !session) {
      pushToast('WhatsApp reminders require an authenticated Supabase session.', 'warning')
      return
    }
    if (!member.phone) {
      pushToast('This member does not have a phone number on record.', 'warning')
      return
    }

    setIsSendingWhatsAppReminder(true)
    try {
      await sendWhatsAppNotification(member.memberId, 'membership_expiring_soon')
      pushToast('WhatsApp reminder submitted to the provider.', 'success')
    } catch (error) {
      pushToast(error.message || 'Could not send the WhatsApp reminder.', 'warning')
    } finally {
      setIsSendingWhatsAppReminder(false)
    }
  }

  const openPaymentModal = () => {
    setPaymentForm({ memberCode: selectedMember?.memberId || '', amount: '', paymentMethod: 'cash', paymentDate: getTodayIsoKolkata(), notes: '' })
    setShowPaymentModal(true)
  }

  const handleRecordPayment = async (event) => {
    event.preventDefault()
    if (isRecordingPayment) return
    setIsRecordingPayment(true)
    try {
      const recordedPayment = await dataService.recordPayment(paymentForm)
      setPayments((previous) => [recordedPayment, ...previous.filter((payment) => payment.id !== recordedPayment.id)])
      setPaymentsPage(1)
      setShowPaymentModal(false)

      try {
        const [nextPayments, nextLedgerSummary] = await Promise.all([
          dataService.getPaymentsFromSupabase(),
          dataService.getLedgerSummaryFromSupabase(),
        ])
        setPayments(nextPayments)
        setLedgerSummary(nextLedgerSummary)
        pushToast('Payment recorded and ledger balances updated.', 'success')
      } catch (refreshError) {
        setLiveDataError(refreshError.message || 'Payment saved, but the ledger could not be refreshed.')
        pushToast('Payment recorded, but the ledger refresh failed. Retry the live data sync.', 'warning')
      }
    } catch (error) {
      pushToast(error.message || 'Payment was not recorded.', 'warning')
    } finally {
      setIsRecordingPayment(false)
    }
  }

  const handleArchiveMember = async () => {
    if (!selectedMember) return
    const confirmed = window.confirm(`Archive ${selectedMember.name}? This keeps the record but hides it from the active list.`)
    if (!confirmed) return

    try {
      const archived = await dataService.archiveMember(selectedMember.id || selectedMember.memberId)
      if (archived) {
        setMembers((prev) => prev
          .map((member) => (member.id === archived.id ? archived : member))
          .filter((member) => member.status !== 'archived'))
      }
      setSelectedMemberId(null)
      setCurrentView('members')
      pushToast('Member archived successfully', 'success')
    } catch (err) {
      pushToast(err.message || 'Failed to archive member.', 'warning')
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

  const renderDashboard = ({ onOpenAddMember, onNavigate }) => {
    const todayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(dashboardClock)
    const revenuePeak = Math.max(1, ...weeklyRevenue.map((day) => day.amount))
    const recentPayments = payments.slice(0, 5)

    return (
      <div className="page-shell dashboard-page">
        <div className="mode-banner dashboard-mode-banner">
          {!isSupabaseReady && <span className="demo-badge">Demo data</span>}
          {appConfig.isMockMode ? 'Development mock mode' : 'Production mode • Connected services'}
        </div>

        <header className="dashboard-header">
          <div>
            <p className="dashboard-greeting">Guru Fitness Health Club · Dhule</p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Gym overview</h1>
            <p className="dashboard-date"><CalendarDays size={15} /> {todayLabel}</p>
          </div>
          <div className="dashboard-actions">
            <button type="button" className="primary-button bg-[#007AFF] hover:bg-[#0062CC] text-white font-medium px-4 py-2 rounded-xl shadow-sm transition-colors active:scale-[0.98]" onClick={onOpenAddMember}><UserRoundPlus className="text-white" size={16} /> Add Member</button>
            <button type="button" className="secondary-button" onClick={() => onNavigate('attendance')}><ScanLine className="text-gray-400" size={16} /> Record attendance</button>
            <button type="button" className="secondary-button" onClick={openPaymentModal}><CreditCard className="text-gray-400" size={16} /> Record payment</button>
          </div>
        </header>

        <section className="dashboard-kpis" aria-label="Gym performance">
          <article className="dashboard-kpi ios-card bg-white rounded-2xl border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="kpi-heading text-xs font-medium uppercase tracking-wider text-gray-500"><span>Total Members</span><UsersRound className="text-gray-400" size={18} /></div>
            <strong className="text-3xl font-semibold tracking-tight text-gray-900">{summary.totalMembers.toLocaleString('en-IN')}</strong>
            <small>Registered member records</small>
          </article>
          <article className="dashboard-kpi ios-card bg-white rounded-2xl border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="kpi-heading text-xs font-medium uppercase tracking-wider text-gray-500"><span>Active Members</span><Activity className="text-gray-400" size={18} /></div>
            <strong className="text-3xl font-semibold tracking-tight text-gray-900">{summary.activeMembers.toLocaleString('en-IN')}</strong>
            <small>Membership active today</small>
          </article>
          <article className="dashboard-kpi ios-card bg-white rounded-2xl border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="kpi-heading text-xs font-medium uppercase tracking-wider text-gray-500"><span>Today&apos;s Attendance</span><CalendarCheck2 className="text-gray-400" size={18} /></div>
            <strong className="text-3xl font-semibold tracking-tight text-gray-900">{summary.todayAttendanceCount.toLocaleString('en-IN')}</strong>
            <small>Check-ins recorded today</small>
          </article>
          <article className="dashboard-kpi revenue-kpi ios-card bg-white rounded-2xl border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="kpi-heading text-xs font-medium uppercase tracking-wider text-gray-500"><span>Today&apos;s Revenue</span><CircleDollarSign className="text-gray-400" size={18} /></div>
            <strong className="text-3xl font-semibold tracking-tight text-gray-900">{formatCurrency(todayRevenue)}</strong>
            <small>Payments received today</small>
          </article>
        </section>

        <section className="dashboard-overview-grid">
          <article className="dashboard-panel attendance-overview ios-card bg-white rounded-2xl border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="dashboard-panel-heading">
              <div><p className="section-kicker text-xs font-medium uppercase tracking-wider text-gray-500">Today</p><h2 className="text-gray-900 font-semibold">Recent attendance</h2></div>
              <button type="button" className="text-action" onClick={() => onNavigate('attendance')}>View all <ArrowUpRight size={15} /></button>
            </div>
            <div className="dashboard-table-wrap">
              <table className="dashboard-table attendance-table">
                <thead><tr><th className="text-xs font-medium uppercase tracking-wider text-gray-500">Member</th><th className="text-xs font-medium uppercase tracking-wider text-gray-500">Member ID</th><th className="text-xs font-medium uppercase tracking-wider text-gray-500">Check-in</th><th className="text-xs font-medium uppercase tracking-wider text-gray-500">Status</th></tr></thead>
                <tbody>
                  {todayAttendance.length ? todayAttendance.slice(0, 5).map((person) => (
                    <tr key={person.memberId}>
                      <td><span className="dashboard-attendance-member"><Avatar name={person.name} small /><strong>{person.name}</strong></span></td>
                      <td>#{person.memberId}</td>
                      <td>{person.time}</td>
                      <td><span className={`dashboard-attendance-status ${person.status === 'Override' ? 'override' : ''}`}>{person.status}</span></td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4"><p className="dashboard-empty">No attendance recorded today.</p></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="dashboard-panel revenue-overview ios-card bg-white rounded-2xl border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="dashboard-panel-heading">
              <div><p className="section-kicker text-xs font-medium uppercase tracking-wider text-gray-500">Last seven days</p><h2 className="text-gray-900 font-semibold">Revenue overview</h2></div>
              <strong className="revenue-total text-gray-900">{formatCurrency(weeklyRevenue.reduce((total, day) => total + day.amount, 0))}</strong>
            </div>
            <div className="revenue-chart" role="img" aria-label="Paid revenue for the last seven days">
              {weeklyRevenue.map((day) => (
                <div className="revenue-day" key={day.date} title={`${day.label}: ${formatCurrency(day.amount)}`}>
                  <span>{day.amount ? formatCurrency(day.amount) : '—'}</span>
                  <div className="revenue-bar-track"><i style={{ height: `${Math.max(4, (day.amount / revenuePeak) * 100)}%` }} /></div>
                  <small>{day.label}</small>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="dashboard-lower-grid">
          <article className="dashboard-panel expiring-overview ios-card bg-white rounded-2xl border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="dashboard-panel-heading">
              <div><p className="section-kicker text-xs font-medium uppercase tracking-wider text-gray-500">Membership health</p><h2 className="text-gray-900 font-semibold">Expiring soon</h2></div>
              <button type="button" className="text-action" onClick={() => { setMemberFilter('Expiring Soon'); setMembersPage(1); onNavigate('members') }}>View all <ArrowUpRight size={15} /></button>
            </div>
            {expiringSoon.length ? expiringSoon.slice(0, 3).map((member) => (
              <div className="expiring-member-row" key={member.memberId}>
                <Avatar name={member.name} small />
                <div className="dashboard-row-main"><strong>{member.name}</strong><span>#{member.memberId} · {member.plan}</span></div>
                <div className="expiring-date"><strong>{formatDate(member.expiryDate)}</strong><span>{member.daysLeft === 0 ? 'Expires today' : `${member.daysLeft} ${member.daysLeft === 1 ? 'day' : 'days'} left`}</span></div>
                <button type="button" className="icon-action" aria-label={`View ${member.name}`} title="View member" onClick={() => { selectMember(member.memberId); onNavigate('members') }}><ArrowUpRight size={17} /></button>
              </div>
            )) : <p className="dashboard-empty">No memberships are expiring soon.</p>}
          </article>

          <article className="dashboard-panel payments-overview ios-card bg-white rounded-2xl border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="dashboard-panel-heading">
              <div><p className="section-kicker text-xs font-medium uppercase tracking-wider text-gray-500">Cash flow</p><h2 className="text-gray-900 font-semibold">Recent payments</h2></div>
              <button type="button" className="text-action" onClick={() => onNavigate('payments')}>View all <ArrowUpRight size={15} /></button>
            </div>
            {recentPayments.length ? recentPayments.map((payment) => (
              <div className="payment-overview-row" key={payment.id || `${payment.receiptNumber}-${payment.date}`}>
                <div className="payment-mark"><WalletCards className="text-gray-400" size={17} /></div>
                <div className="dashboard-row-main"><strong>{payment.member}</strong><span>{payment.method}</span></div>
                <div className="payment-amount"><strong>{formatCurrency(payment.amount)}</strong><span>{formatDate(payment.date)}</span></div>
              </div>
            )) : <p className="dashboard-empty">No payments recorded yet.</p>}
          </article>
        </section>

        <section className="dashboard-analytics-grid" aria-label="Attendance analytics">
          <GymLeaderboard members={activeMembers} />
          <PeakHoursHeatmap attendance={todayAttendance} />
          {['owner', 'admin'].includes(userRole) && <ChurnRadar />}
        </section>
      </div>
    )
  }

  const renderScanPage = () => (
    <CheckInView
      checkInState={checkInState}
      isMarkingAttendance={isMarkingAttendance}
      onCodeSubmit={handleCodeSubmit}
      onMarkAttendance={(memberId, allowExpired = false) => handleMarkAttendance(memberId, allowExpired)}
      onScanQr={async (qrText) => {
        if (!isSupabaseReady || !session) {
          pushToast('Scan requires a live Supabase connection.', 'warning')
          return
        }
        const member = await dataService.getMemberByQrToken(qrText)
        if (!member) {
          pushToast('Invalid QR Code. Member not found.', 'warning')
          setCheckInState({ type: 'notFound', code: 'QR', pendingCode: '' })
          setTimeout(() => {
            setCheckInState((prev) => (prev.type === 'notFound' ? { type: 'idle' } : prev))
          }, 3000)
          return
        }
        if (getMembershipStatus(member) === 'Expired') {
          setCheckInState({ type: 'expired', member, pendingCode: member.memberId })
          return
        }
        await handleMarkAttendance(member.memberId)
        setTimeout(() => {
          setCheckInState((prev) => {
            if (prev.type === 'success' || prev.type === 'alreadyMarked' || prev.type === 'successWarning') {
              return { type: 'idle' }
            }
            return prev
          })
        }, 3000)
      }}
      onUsbScan={async (qrText) => {
        if (!isSupabaseReady || !session) {
          pushToast('Scan requires a live Supabase connection.', 'warning')
          return
        }
        const member = await dataService.getMemberByQrToken(qrText)
        if (!member) {
          pushToast('Invalid QR Code. Member not found.', 'warning')
          setCheckInState({ type: 'notFound', code: 'QR', pendingCode: '' })
          setTimeout(() => {
            setCheckInState((prev) => (prev.type === 'notFound' ? { type: 'idle' } : prev))
          }, 3000)
          return
        }
        if (getMembershipStatus(member) === 'Expired') {
          setCheckInState({ type: 'expired', member, pendingCode: member.memberId })
          return
        }
        await handleMarkAttendance(member.memberId)
        setTimeout(() => {
          setCheckInState((prev) => {
            if (prev.type === 'success' || prev.type === 'alreadyMarked' || prev.type === 'successWarning') {
              return { type: 'idle' }
            }
            return prev
          })
        }, 3000)
      }}
      onRenew={(member) => openRenewalModal(member)}
      onAllowExpiredConfirm={(member) => {
        setCheckInState({ type: 'confirmExpiredAttendance', member, pendingCode: member.memberId })
      }}
      onNextMember={() => {
        const nextState = { type: 'idle' }
        setCheckInState(nextState)
      }}
      onCancelExpiredConfirm={() => {
        const nextState = { type: 'idle' }
        setCheckInState(nextState)
      }}
    />
  )

  const renderMembersPage = () => (
    <Members
      members={pagedMembers}
      totalCount={filteredMembers.length}
      searchQuery={searchQuery}
      onSearchChange={(value) => {
        setSearchQuery(value)
        setMembersPage(1)
      }}
      filterOptions={filterOptions}
      memberFilter={memberFilter}
      onFilterChange={(value) => {
        setMemberFilter(value)
        setMembersPage(1)
      }}
      currentPage={currentMembersPage}
      pageCount={membersPageCount}
      pageSize={MEMBER_PAGE_SIZE}
      onPageChange={setMembersPage}
      onAddMember={openAddMember}
      onSelectMember={selectMember}
      onEditMember={openEditMember}
      getMembershipStatus={getMembershipStatus}
      formatDate={formatDate}
    >
      {selectedMember && (
        <div className="profile-panel panel-card">
          <div className="profile-header">
            <MemberPhoto path={selectedMember.photo} name={selectedMember.name} size="profile" />
            <div>
              <h2>{selectedMember.name}</h2>
              <p>{selectedMember.memberId}</p>
            </div>
            {renderStatusBadge(getMembershipStatus(selectedMember))}
          </div>

          <div className="profile-actions">
            <button
              type="button"
              className="primary-button"
              disabled={isMarkingAttendance}
              onClick={() => handleMarkAttendance(selectedMember.memberId)}
            >
              {isMarkingAttendance ? 'Saving…' : 'Mark Attendance'}
            </button>
            <button type="button" className="secondary-button" onClick={() => openRenewalModal(selectedMember)}>
              Renew
            </button>
            <button type="button" className="secondary-button" onClick={() => openEditMember(selectedMember)}>
              Edit
            </button>
            <button
              type="button"
              className="secondary-button whatsapp-send-button"
              disabled={isSendingWhatsAppReminder}
              onClick={() => handleSendWhatsApp(selectedMember)}
            >
              {isSendingWhatsAppReminder ? 'Sending…' : 'Send WhatsApp Reminder'}
            </button>
            <button type="button" className="secondary-button" onClick={openWhatsAppActions}>
              WhatsApp
            </button>
            <button type="button" className="secondary-button" onClick={handleArchiveMember}>
              Archive
            </button>
            <button type="button" className="secondary-button" onClick={() => setCurrentView('scan')}>
              Show QR
            </button>
          </div>

          <nav className="profile-tabs" role="tablist" aria-label="Member profile sections">
            {['Overview', 'Membership', 'Attendance', 'Payments', 'Notes', 'Activity'].map((tab) => (
              <button type="button" role="tab" aria-selected={memberProfileTab === tab} className={memberProfileTab === tab ? 'active' : ''} key={tab} onClick={() => setMemberProfileTab(tab)}>
                {tab}
              </button>
            ))}
          </nav>

          {memberProfileTab === 'Overview' && (
            <>
              <div className="profile-grid">
                <div className="info-block"><span className="info-label">Phone</span><strong>{selectedMember.phone}</strong></div>
                <div className="info-block"><span className="info-label">Membership</span><strong>{selectedMember.plan}</strong></div>
                <div className="info-block"><span className="info-label">Status</span><strong>{getMembershipStatus(selectedMember)}</strong></div>
                <div className="info-block"><span className="info-label">Today</span><strong>{selectedMember.attendanceHistory.some((entry) => entry.date === todayIso) ? 'Present Today' : 'Not marked'}</strong></div>
              </div>
              <div className="qr-box">
                <Suspense fallback={<p className="dashboard-empty" role="status">Preparing member QR…</p>}>
                  <QRCodeCard member={selectedMember} onRegenerateToken={false} />
                </Suspense>
              </div>
            </>
          )}

          {memberProfileTab === 'Membership' && (
            <div className="profile-grid">
              <div className="info-block"><span className="info-label">Plan</span><strong>{selectedMember.plan}</strong></div>
              <div className="info-block"><span className="info-label">Status</span><strong>{getMembershipStatus(selectedMember)}</strong></div>
              <div className="info-block"><span className="info-label">Fee</span><strong>{formatCurrency(selectedMember.fee)}</strong></div>
              <div className="info-block"><span className="info-label">Start</span><strong>{formatDate(selectedMember.startDate)}</strong></div>
              <div className="info-block"><span className="info-label">Expiry</span><strong>{formatDate(selectedMember.expiryDate)}</strong></div>
            </div>
          )}

          {memberProfileTab === 'Attendance' && (
            <div className="history-panel profile-tab-content">
              <h3>Attendance History</h3>
              <div className="history-list">
                {isLoadingMemberAttendance && <p className="dashboard-empty">Loading attendance…</p>}
                {!isLoadingMemberAttendance && memberAttendanceState.error && (
                  <p className="dashboard-empty" role="alert">{memberAttendanceState.error}</p>
                )}
                {!isLoadingMemberAttendance && !memberAttendanceState.error && memberAttendanceRows.slice(0, 10).map((entry, index) => (
                  <div key={`${selectedMember.memberId}-${entry.date}-${index}`} className="history-item"><span>{formatDate(entry.date)}</span><span>{entry.time}</span><span>{entry.status}</span></div>
                ))}
                {!isLoadingMemberAttendance && !memberAttendanceState.error && !memberAttendanceRows.length && <p className="dashboard-empty">No attendance has been recorded.</p>}
              </div>
            </div>
          )}

          {memberProfileTab === 'Payments' && (
            <div className="history-panel profile-tab-content">
              <h3>Payment History</h3>
              <div className="history-list">
                {memberPaymentRows.slice(0, 10).map((entry, index) => (
                  <div key={`${entry.receiptNumber || entry.member}-${index}`} className="history-item"><span>{formatDate(entry.date)}</span><span>{formatCurrency(entry.amount)}</span><span>{entry.method}</span></div>
                ))}
                {!memberPaymentRows.length && <p className="dashboard-empty">No payments have been recorded.</p>}
              </div>
            </div>
          )}

          {memberProfileTab === 'Notes' && <p className="profile-empty-state">No notes recorded for this member.</p>}

          {memberProfileTab === 'Activity' && (
            <div className="history-panel profile-tab-content">
              <h3>Recent Activity</h3>
              <div className="history-list">
                {isLoadingMemberActivity && <p className="dashboard-empty">Loading activity…</p>}
                {!isLoadingMemberActivity && memberActivityRows.map((entry) => (
                  <div key={entry.id} className="history-item"><span>{String(entry.action).replaceAll('_', ' ')}</span><span>{formatDate(entry.created_at.slice(0, 10))}</span><span>{entry.metadata?.memberCode || ''}</span></div>
                ))}
                {!isLoadingMemberActivity && !memberActivityRows.length && <p className="dashboard-empty">No activity has been recorded.</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </Members>
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
        <StatsCard label="Active" value={membershipCounts.active.toString()} accent="green" />
        <StatsCard label="Expiring Soon" value={membershipCounts.expiringSoon.toString()} accent="amber" />
        <StatsCard label="Expired" value={membershipCounts.expired.toString()} accent="red" />
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
            {visibleMembers.slice(0, 12).map((member) => (
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
          <p className="eyebrow">Financial ledger</p>
          <h1>Payments &amp; Dues</h1>
          <p className="dashboard-date">Collected payments and outstanding membership balances</p>
        </div>
        <button type="button" className="primary-button" onClick={openPaymentModal}>Record Payment</button>
      </header>

      <section className="ledger-summary-grid" aria-label="Financial summary">
        <article className="ledger-summary-card">
          <span>Total Revenue Collected</span>
          <strong>{ledgerSummary ? formatCurrency(ledgerSummary.revenueCollected) : '—'}</strong>
          <small>Paid receipts, net of recorded refunds</small>
        </article>
        <article className="ledger-summary-card dues-summary-card">
          <span>Total Outstanding Balance Due</span>
          <strong>{ledgerSummary ? formatCurrency(ledgerSummary.outstandingBalance) : '—'}</strong>
          <small>Membership charges less net paid amounts</small>
        </article>
      </section>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Member</th>
              <th>Receipt</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Membership period</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length > 0 ? (
              pagedPayments.map((payment, index) => (
                <tr key={payment.id || `${payment.receiptNumber || payment.member}-${index}`}>
                  <td>{formatDate(payment.date)}</td>
                  <td>{payment.member}</td>
                  <td>{payment.receiptNumber || '—'}</td>
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
                <td colSpan="7">
                  <div className="table-empty-state">
                    No payment records yet.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {paymentsPageCount > 1 && (
        <nav className="list-pagination" aria-label="Payment list pages">
          <span>{(currentPaymentsPage - 1) * PAYMENT_PAGE_SIZE + 1}–{Math.min(currentPaymentsPage * PAYMENT_PAGE_SIZE, payments.length)} of {payments.length}</span>
          <div>
            <button type="button" className="secondary-button compact" disabled={currentPaymentsPage === 1} onClick={() => setPaymentsPage(currentPaymentsPage - 1)}>
              Previous
            </button>
            <span aria-current="page">Page {currentPaymentsPage} of {paymentsPageCount}</span>
            <button type="button" className="secondary-button compact" disabled={currentPaymentsPage === paymentsPageCount} onClick={() => setPaymentsPage(currentPaymentsPage + 1)}>
              Next
            </button>
          </div>
        </nav>
      )}
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
        return <Attendance>{renderScanPage()}</Attendance>
      case 'members':
        return renderMembersPage()
      case 'memberships':
        return renderMembershipsPage()
      case 'payments':
        return <Payments>{renderPaymentsPage()}</Payments>
      case 'settings':
        return <Settings>{renderSettingsPage()}</Settings>
      case 'exercises':
        return <ExerciseLibrary />
      case 'dashboard':
      default:
        return renderDashboard({ onOpenAddMember: openAddMember, onNavigate: setActiveTab })
    }
  }

  if (isMemberPortalRoute) {
    return <MemberPortal />
  }

  if (!session && isSupabaseReady) {
    return (
      <AuthScreen
        isSupabaseReady={true}
        isLoading={authLoading}
        error={authError}
        onSubmit={handleLogin}
        onSignUp={handleSignUp}
        onGoogleSignIn={handleGoogleSignIn}
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
        onGoogleSignIn={handleGoogleSignIn}
        onDemoContinue={handleDemoContinue}
      />
    )
  }

  if (isSupabaseReady && session && isLoadingLiveData) {
    return (
      <div className="app-shell ios-light-shell flex h-screen bg-[#F5F5F7] text-[#1D1D1F] overflow-hidden">
        <Sidebar
          navItems={visibleNavItems}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAddMember={openAddMember}
          userEmail={session?.user?.email}
          userRole={userRole}
          onLogout={handleLogout}
        />
        <main className="main-panel flex-1 min-w-0">
          <div className="page-shell">
            <div className="mode-banner">
              <span className="demo-badge" style={{ opacity: 0 }}>Loading</span>
              Loading live gym data…
            </div>
            <div className="stats-grid" style={{ opacity: 0.45 }}>
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="stats-card skeleton-card" />
              ))}
            </div>
            <div className="member-list-grid" style={{ opacity: 0.45 }}>
              {[1, 2, 3].map((item) => (
                <div key={item} className="member-card skeleton-card" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell ios-light-shell flex h-screen bg-[#F5F5F7] text-[#1D1D1F] overflow-hidden">
      <Sidebar
        navItems={visibleNavItems}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpenAddMember={openAddMember}
      userEmail={session?.user?.email}
      userRole={userRole}
      onLogout={handleLogout}
    />

    <main className="main-panel flex-1 min-w-0">
        {liveDataError && (
          <div className="live-data-error-banner" role="alert">
            <span className="demo-badge">Sync failed</span>
            <span>
              Could not load live gym data ({liveDataError}). Members, attendance, and payments shown may be empty or out of date.
            </span>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setLiveDataRetryToken((prev) => prev + 1)}
            >
              Retry
            </button>
          </div>
        )}
        {currentView === 'dashboard' ? (
          <Dashboard onOpenAddMember={openAddMember} onNavigate={setActiveTab}>
            {({ onOpenAddMember, onNavigate }) => renderDashboard({ onOpenAddMember, onNavigate })}
          </Dashboard>
        ) : (
          renderPage()
        )}
      </main>

      {scanResult && (
        <div className={`kiosk-scan-backdrop kiosk-scan-${scanResult.status}`} role="presentation">
          <section className="kiosk-scan-dialog" role="status" aria-live="assertive" aria-atomic="true">
            <button
              type="button"
              className="kiosk-scan-close"
              aria-label="Close scan result"
              onClick={() => setScanResult(null)}
            >
              <X size={20} />
            </button>
            {scanResult.status === 'loading' ? (
              <>
                <LoaderCircle className="kiosk-scan-status-icon is-spinning" size={58} aria-hidden="true" />
                <p className="kiosk-scan-kicker">Verifying membership</p>
                <h2>Checking access…</h2>
                <p className="kiosk-scan-detail">Please wait while we verify this member.</p>
              </>
            ) : scanResult.status === 'granted' ? (
              <>
                <CheckCircle2 className="kiosk-scan-status-icon" size={58} aria-hidden="true" />
                <span className="kiosk-scan-badge">ACCESS GRANTED</span>
                <h2>{scanResult.member.name}</h2>
                <p className="kiosk-scan-member-id">Member ID · {scanResult.member.memberId}</p>
                <p className="kiosk-scan-detail">{scanResult.message}</p>
              </>
            ) : (
              <>
                <XCircle className="kiosk-scan-status-icon" size={58} aria-hidden="true" />
                <span className="kiosk-scan-badge">
                  {scanResult.status === 'denied' ? 'ACCESS DENIED' : 'SCAN ERROR'}
                </span>
                <h2>{scanResult.member?.name || 'Unable to verify member'}</h2>
                {scanResult.member && <p className="kiosk-scan-member-id">Member ID · {scanResult.member.memberId}</p>}
                <p className="kiosk-scan-detail">{scanResult.reason}</p>
              </>
            )}
          </section>
        </div>
      )}

      {showAddMember && (
        <div className="modal-backdrop ios-modal-backdrop bg-black/20 backdrop-blur-sm" onClick={() => setShowAddMember(false)}>
          <div
            className="modal-card registration-modal-card ios-modal-card bg-white rounded-2xl border border-black/5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-member-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="add-member-title">Add Member</h2>
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
                  <span>Member Code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    value={memberForm.memberId}
                    onChange={(event) => setMemberForm((prev) => ({ ...prev, memberId: event.target.value.replace(/\D/g, '').slice(0, 3) }))}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  <span>Membership Plan</span>
                  <select
                    value={memberForm.planId || ''}
                    onChange={(event) => {
                      const nextPlan = membershipPlans.find((plan) => plan.id === event.target.value)
                      setMemberForm((prev) => ({
                        ...prev,
                        planId: event.target.value,
                        plan: nextPlan?.name || '',
                        fee: String(nextPlan ? Number(nextPlan.price || 0) : ''),
                        expiryDate: nextPlan ? getPlanExpiryDate(nextPlan, prev.startDate || getTodayIsoKolkata()) : prev.expiryDate,
                      }))
                    }}
                  >
                    {membershipPlans.length > 0 ? membershipPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>{plan.name} • ₹{Number(plan.price || 0)}</option>
                    )) : <option value="">Loading plans…</option>}
                  </select>
                </label>
              </div>

              <div className="field-row two-up">
                <label>
                  <span>Membership Fee</span>
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
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </label>
              </div>

              <div className="field-row two-up">
                <label>
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={toDateInputValue(memberForm.startDate)}
                    onChange={(event) => {
                      const nextStartDate = event.target.value || getTodayIsoKolkata()
                      const selectedMemberPlan = membershipPlans.find((plan) => plan.id === memberForm.planId) || membershipPlans[0] || null
                      const nextExpiry = selectedMemberPlan ? getPlanExpiryDate(selectedMemberPlan, nextStartDate) : nextStartDate
                      setMemberForm((prev) => ({ ...prev, startDate: nextStartDate, expiryDate: nextExpiry }))
                    }}
                  />
                </label>
                <label>
                  <span>Expiry Date</span>
                  <input
                    type="date"
                    value={toDateInputValue(memberForm.expiryDate)}
                    readOnly
                  />
                </label>
              </div>

              <div className="photo-upload-field">
                <label>
                  <span>Profile Photograph *</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(event) => selectMemberPhoto(event, setMemberPhotoSelection, setMemberPhotoError, pushToast)}
                  />
                </label>
                <p className="field-help">Profile photo is required. JPG, PNG, or WEBP, up to 10 MB.</p>
                {memberPhotoSelection.previewUrl && (
                  <div className="photo-preview-row">
                    <img src={memberPhotoSelection.previewUrl} alt="Selected member profile" />
                    <span>{memberPhotoSelection.file?.name}</span>
                  </div>
                )}
                {memberPhotoError && <p className="photo-upload-error" role="alert">{memberPhotoError}</p>}
              </div>

              <div className="button-row right-align">
                <button type="button" className="ghost-button" onClick={() => setShowAddMember(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={isSubmittingMember || membershipPlans.length === 0}>
                  {isSubmittingMember ? 'Saving…' : memberPhotoError ? 'Retry Save' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditMember && (
        <div className="modal-backdrop ios-modal-backdrop bg-black/20 backdrop-blur-sm" onClick={() => setShowEditMember(false)}>
          <div className="modal-card ios-modal-card bg-white rounded-2xl border border-black/5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Member</h2>
              <button type="button" className="close-button" onClick={() => setShowEditMember(false)}>×</button>
            </div>

            <form onSubmit={handleEditMember} className="member-form">
              <label>
                <span>Full Name</span>
                <input
                  type="text"
                  value={editMemberForm.fullName}
                  onChange={(event) => setEditMemberForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  required
                />
              </label>

              <label>
                <span>Phone Number</span>
                <input
                  type="tel"
                  value={editMemberForm.phone}
                  onChange={(event) => setEditMemberForm((prev) => ({ ...prev, phone: event.target.value }))}
                  required
                />
              </label>

              <div className="photo-upload-field">
                <span className="field-label">Profile Photograph</span>
                {editPhotoSelection.previewUrl ? (
                  <div className="photo-preview-row">
                    <img src={editPhotoSelection.previewUrl} alt="Replacement member profile" />
                    <span>{editPhotoSelection.file?.name}</span>
                  </div>
                ) : removeEditPhoto ? (
                  <p className="field-help">The current photograph will be removed when you save.</p>
                ) : editMemberForm.photo ? (
                  <MemberPhoto path={editMemberForm.photo} name={editMemberForm.fullName} size="compact" />
                ) : (
                  <p className="photo-missing-warning">This member has no profile photo. Choose one to add it.</p>
                )}
                <label>
                  <span>Replace photograph</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      selectMemberPhoto(event, setEditPhotoSelection, setEditMemberError, pushToast)
                      if (isSupportedMemberPhoto(file)) setRemoveEditPhoto(false)
                    }}
                  />
                </label>
                {editMemberForm.photo && (
                  <label className="remove-photo-option">
                    <input
                      type="checkbox"
                      checked={removeEditPhoto}
                      disabled={Boolean(editPhotoSelection.file)}
                      onChange={(event) => setRemoveEditPhoto(event.target.checked)}
                    />
                    Remove photograph
                  </label>
                )}
                <p className="field-help">Leave this unchanged to keep the current photograph.</p>
                {editMemberError && <p className="photo-upload-error" role="alert">{editMemberError}</p>}
              </div>

              <div className="button-row right-align">
                <button type="button" className="ghost-button" onClick={() => setShowEditMember(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={isSavingMember}>
                  {isSavingMember ? 'Saving…' : editMemberError ? 'Retry Save' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWhatsAppActions && (
        <div className="modal-backdrop ios-modal-backdrop bg-black/20 backdrop-blur-sm" onClick={() => setShowWhatsAppActions(false)}>
          <div className="modal-card small-card whatsapp-actions-modal ios-modal-card bg-white rounded-2xl border border-black/5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>WhatsApp</h2>
              <button type="button" className="close-button" onClick={() => setShowWhatsAppActions(false)}>×</button>
            </div>
            {isCheckingWhatsApp ? (
              <p className="muted-copy">Checking member phone number…</p>
            ) : !selectedMember || !selectedMember.phone ? (
              <p className="whatsapp-unconfigured">Member phone number is required.</p>
            ) : (
              <div className="whatsapp-action-list">
                <button type="button" className="secondary-button" disabled={Boolean(sendingWhatsAppEvent)} onClick={() => handleWhatsAppAction('membership_renewal_reminder')}>
                  Send Renewal Reminder
                </button>
                <button type="button" className="secondary-button" disabled={Boolean(sendingWhatsAppEvent)} onClick={() => handleWhatsAppAction('payment_acknowledgement')}>
                  Send Payment Acknowledgement
                </button>
                <button type="button" className="secondary-button" disabled={Boolean(sendingWhatsAppEvent)} onClick={() => handleWhatsAppAction('attendance_general')}>
                  Attendance / General
                </button>
                <button type="button" className="secondary-button" disabled={Boolean(sendingWhatsAppEvent)} onClick={() => handleWhatsAppAction('membership_renewed')}>
                  Membership Renewed
                </button>
                <button type="button" className="secondary-button" disabled={Boolean(sendingWhatsAppEvent)} onClick={() => handleWhatsAppAction('payment_receipt')}>
                  Payment Receipt
                </button>
                {sendingWhatsAppEvent && <p className="muted-copy">Opening WhatsApp…</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-backdrop ios-modal-backdrop bg-black/20 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-card small-card ios-modal-card bg-white rounded-2xl border border-black/5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Payment</h2>
              <button type="button" className="close-button" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <form className="member-form" onSubmit={handleRecordPayment}>
              <label>
                <span>Member</span>
                <select value={paymentForm.memberCode} onChange={(event) => setPaymentForm((prev) => ({ ...prev, memberCode: event.target.value }))} required>
                  <option value="">Select member</option>
                  {visibleMembers.map((member) => <option key={member.memberId} value={member.memberId}>{member.name} · {member.memberId}</option>)}
                </select>
              </label>
              <div className="field-row two-up">
                <label>
                  <span>Amount</span>
                  <input type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))} required />
                </label>
                <label>
                  <span>Payment Method</span>
                  <select value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}>
                    <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option>
                  </select>
                </label>
              </div>
              <label>
                <span>Payment Date</span>
                <input type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentDate: event.target.value }))} required />
              </label>
              <label>
                <span>Note</span>
                <input type="text" value={paymentForm.notes} onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Optional payment note" />
              </label>
              <div className="button-row right-align">
                <button type="button" className="ghost-button" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isRecordingPayment}>{isRecordingPayment ? 'Saving…' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRenewModal && (
        <div className="modal-backdrop ios-modal-backdrop bg-black/20 backdrop-blur-sm" onClick={() => setShowRenewModal(false)}>
          <div className="modal-card small-card ios-modal-card bg-white rounded-2xl border border-black/5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Renew Membership</h2>
              <button type="button" className="close-button" onClick={() => setShowRenewModal(false)}>×</button>
            </div>

            {renewMemberId && (
              <div className="renew-detail">
                <p><strong>Member:</strong> {members.find((member) => member.memberId === renewMemberId)?.name}</p>
                <p><strong>Current expiry:</strong> {formatDate(members.find((member) => member.memberId === renewMemberId)?.expiryDate || getTodayIsoKolkata())}</p>
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
              <button type="button" className="primary-button" onClick={confirmRenewal} disabled={isRenewingMembership}>
                {isRenewingMembership ? 'Saving…' : 'Confirm Renewal'}
              </button>
            </div>
          </div>
        </div>
      )}

      <FloatingAIChat
        userName={session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Athlete'}
      />
      <ToastList toasts={toasts} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/library" element={<ExerciseLibrary />} />
        <Route path="/exercise/:id" element={<ExerciseDetail />} />
        <Route path="*" element={<DashboardApp />} />
      </Routes>
    </BrowserRouter>
  )
}

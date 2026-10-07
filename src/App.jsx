import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, CalendarCheck2, CalendarDays, CircleDollarSign, Clock3, CreditCard, ScanLine, UserRoundPlus, UsersRound, WalletCards } from 'lucide-react'
import './App.css'
import Sidebar from './components/Sidebar'
import StatsCard from './components/StatsCard'
import Avatar from './components/Avatar'
import ToastList from './components/ToastList'
import AuthScreen from './components/AuthScreen'
import CheckInView from './components/CheckInView'
import MemberPhoto from './components/MemberPhoto'
import { appConfig } from './config/appConfig'
import { dataService } from './services/dataService'
import { MAX_MEMBER_PHOTO_BYTES } from './services/memberPhotoService'
import { getWhatsAppIntegrationStatus, sendWhatsAppNotification } from './services/whatsappNotificationService'
import {
  ensureCurrentUserProfile,
  getCurrentSession,
  isSupabaseReady,
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

const TODAY_ISO = getTodayIsoKolkata()

const navItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'scan', label: "Today's Attendance" },
  { key: 'members', label: 'Members' },
  { key: 'memberships', label: 'Memberships' },
  { key: 'payments', label: 'Payments' },
  { key: 'settings', label: 'Settings' },
]

const filterOptions = ['All', 'Active', 'Expiring Soon', 'Expired']
const memberPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

let toastCounter = 0
const getNextToastId = () => {
  toastCounter += 1
  return `toast-${toastCounter}`
}

const selectMemberPhoto = (event, setSelection, pushToast) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!memberPhotoTypes.has(file.type)) {
    pushToast('Choose a JPG, PNG, or WEBP profile photograph.', 'warning')
    return
  }
  if (file.size > MAX_MEMBER_PHOTO_BYTES) {
    pushToast('Profile photographs must be 10 MB or smaller.', 'warning')
    return
  }

  const previewUrl = URL.createObjectURL(file)
  setSelection((previous) => {
    if (previous.previewUrl) URL.revokeObjectURL(previous.previewUrl)
    return { file, previewUrl }
  })
}

const getFormattedCurrentTime = () => {
  const now = new Date()
  const hours = now.getHours()
  const mins = String(now.getMinutes()).padStart(2, '0')
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

function App() {
  const [members, setMembers] = useState(() => (isSupabaseReady ? [] : dataService.getMembers()))
  const [payments, setPayments] = useState(() => (isSupabaseReady ? [] : dataService.getPayments()))
  const [settings, setSettings] = useState(() => (isSupabaseReady ? { gymName: 'Guru Fitness Health Club', monthlyMembership: 500, phone: '+91 98765 43210', city: 'Dhule', address: 'Dhule, Maharashtra, India' } : dataService.getSettings()))
  const [membershipPlans, setMembershipPlans] = useState([])
  const [currentView, setCurrentView] = useState('dashboard')
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [memberFilter, setMemberFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [showEditMember, setShowEditMember] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [renewMemberId, setRenewMemberId] = useState(null)
  const [editMemberId, setEditMemberId] = useState(null)
  const [scannerState, setScannerState] = useState({ type: 'idle' })
  const [checkInState, setCheckInState] = useState({ type: 'idle' })
  const [toasts, setToasts] = useState([])
  const [memberForm, setMemberForm] = useState(makeMemberForm())
  const [editMemberForm, setEditMemberForm] = useState({ fullName: '', phone: '', photo: '' })
  const [renewalForm, setRenewalForm] = useState({
    amount: 500,
    expiryDate: getTodayIsoKolkata(),
  })
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(() => isSupabaseReady)
  const [dashboardClock] = useState(() => new Date())
  const [authError, setAuthError] = useState('')
  const [isLoadingLiveData, setIsLoadingLiveData] = useState(false)
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false)
  const [isSubmittingMember, setIsSubmittingMember] = useState(false)
  const [isSavingMember, setIsSavingMember] = useState(false)
  const [isRenewingMembership, setIsRenewingMembership] = useState(false)
  const [memberPhotoSelection, setMemberPhotoSelection] = useState({ file: null, previewUrl: '' })
  const [editPhotoSelection, setEditPhotoSelection] = useState({ file: null, previewUrl: '' })
  const [showWhatsAppActions, setShowWhatsAppActions] = useState(false)
  const [isCheckingWhatsApp, setIsCheckingWhatsApp] = useState(false)
  const [isWhatsAppConfigured, setIsWhatsAppConfigured] = useState(false)
  const [sendingWhatsAppEvent, setSendingWhatsAppEvent] = useState('')
  const [memberProfileTab, setMemberProfileTab] = useState('Overview')
  const [memberActivityState, setMemberActivityState] = useState({ memberId: null, rows: [] })
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isRecordingPayment, setIsRecordingPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ memberCode: '', amount: '', paymentMethod: 'cash', paymentDate: getTodayIsoKolkata(), notes: '' })

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
    if (!session || !isSupabaseReady) return

    const loadLiveDatabase = async () => {
      setIsLoadingLiveData(true)
      try {
        const [sbMembers, sbPayments, sbSettings, sbPlans] = await Promise.all([
          dataService.getMembersFromSupabase(),
          dataService.getPaymentsFromSupabase(),
          dataService.getSettingsFromSupabase(),
          dataService.getMembershipPlans(),
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
      } finally {
        setIsLoadingLiveData(false)
      }
    }

    loadLiveDatabase()
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

  const visibleMembers = useMemo(() => members.filter((member) => member.status !== 'archived'), [members])
  const selectedMember = visibleMembers.find((member) => member.memberId === selectedMemberId) || visibleMembers[0]

  const selectedPlan = membershipPlans.find((plan) => plan.id === memberForm.planId) || membershipPlans[0] || null
  const memberActivityRows = memberActivityState.memberId === selectedMember?.id ? memberActivityState.rows : []
  const isLoadingMemberActivity = memberProfileTab === 'Activity' && Boolean(selectedMember?.id) && memberActivityState.memberId !== selectedMember.id

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

  const summary = useMemo(() => computeSummary(visibleMembers), [visibleMembers])
  const todayAttendance = useMemo(() => getTodayAttendance(visibleMembers), [visibleMembers])
  const expiringSoon = useMemo(() => getExpiringSoonMembers(visibleMembers), [visibleMembers])
  const todayIso = getTodayIsoKolkata()
  const todayRevenue = payments
    .filter((payment) => payment.date === todayIso && payment.status === 'Paid')
    .reduce((total, payment) => total + Number(payment.amount || 0), 0)
  const weeklyRevenue = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${todayIso}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() - (6 - index))
    const isoDate = date.toISOString().slice(0, 10)
    return {
      date: isoDate,
      label: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date),
      amount: payments
        .filter((payment) => payment.date === isoDate && payment.status === 'Paid')
        .reduce((total, payment) => total + Number(payment.amount || 0), 0),
    }
  })

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
      pushToast('Already Present Today', 'warning')
      return
    }

    if (getMembershipStatus(member) === 'Expired') {
      setScannerState({ type: 'expired', member })
      return
    }

    setScannerState({ type: 'found', member })
  }

  const handleMarkAttendance = async (memberId, allowExpired = false) => {
    if (isMarkingAttendance) return

    const member = members.find((entry) => entry.memberId === memberId)
    if (!member) return

    const alreadyMarked = member.attendanceHistory.some(
      (entry) => entry.date === TODAY_ISO && entry.status === 'Present',
    )

    if (alreadyMarked) {
      const todayEntry = member.attendanceHistory.find((entry) => entry.date === TODAY_ISO)
      const nextState = { type: 'alreadyMarked', member, time: todayEntry?.time || '6:42 PM' }
      setCheckInState(nextState)
      setScannerState(nextState)
      pushToast('Already Present Today', 'warning')
      return
    }

    setIsMarkingAttendance(true)
    const timeValue = getFormattedCurrentTime()

    const updatedMembers = members.map((entry) => {
      if (entry.memberId !== memberId) return entry
      return {
        ...entry,
        attendanceHistory: [{ date: TODAY_ISO, time: timeValue, status: 'Present' }, ...entry.attendanceHistory],
      }
    })

    setMembers(updatedMembers)
    selectMember(memberId)
    setCurrentView('scan')

    try {
      const attendanceResult = await dataService.recordAttendance(memberId, allowExpired ? 'manual_override' : 'present')

      if (attendanceResult?.alreadyMarked) {
        const originalTime = attendanceResult.originalTime || attendanceResult.time || timeValue
        const nextState = { type: 'alreadyMarked', member, time: originalTime }
        setCheckInState(nextState)
        setScannerState(nextState)
        pushToast('Already Present Today', 'warning')
        return
      }

      if (allowExpired) {
        const nextState = {
          type: 'successWarning',
          member: updatedMembers.find((entry) => entry.memberId === memberId),
          time: attendanceResult?.time || timeValue,
          warning: 'Membership expired',
        }
        setCheckInState(nextState)
        setScannerState(nextState)
        pushToast('Attendance marked with expired warning', 'warning')
        return
      }

      const nextState = {
        type: 'success',
        member: updatedMembers.find((entry) => entry.memberId === memberId),
        time: attendanceResult?.time || timeValue,
      }
      setCheckInState(nextState)
      setScannerState(nextState)
      pushToast('Attendance marked', 'success')
    } catch (err) {
      console.warn('Attendance DB sync warning:', err)
      const nextState = { type: 'idle' }
      setCheckInState(nextState)
      setScannerState(nextState)
      pushToast('Unable to mark attendance', 'warning')
    } finally {
      setIsMarkingAttendance(false)
    }
  }

  const openRenewalModal = (member) => {
    const plan = membershipPlans.find((item) => item.id === member.planId || item.name === member.plan)
    const renewalStartDate = member.expiryDate > getTodayIsoKolkata() ? member.expiryDate : getTodayIsoKolkata()
    setRenewMemberId(member.memberId)
    setRenewalForm({
      amount: Number(plan?.price ?? member.fee),
      expiryDate: plan ? getPlanExpiryDate(plan, renewalStartDate) : member.expiryDate,
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

      const renewedMember = members.find((member) => member.memberId === renewMemberId)
      selectMember(renewMemberId)
      setShowRenewModal(false)
      setScannerState({
        type: 'renewed',
        member: renewedMember,
        newExpiry: renewalForm.expiryDate,
      })
      pushToast('Membership renewed', 'success')
    } catch (err) {
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
        setScannerState(nextState)
        return
      }

      const todayEntry = getMemberTodayAttendance(member)
      if (todayEntry) {
        const nextState = { type: 'alreadyMarked', member, time: todayEntry.time || '—', code, pendingCode: code }
        setCheckInState(nextState)
        setScannerState(nextState)
        return
      }

      if (getMembershipStatus(member) === 'Expired') {
        const nextState = { type: 'expired', member, code, pendingCode: code }
        setCheckInState(nextState)
        setScannerState(nextState)
        return
      }

      const nextState = { type: 'ready', member, code, pendingCode: code }
      setCheckInState(nextState)
      setScannerState(nextState)
    } catch (error) {
      const nextState = { type: 'notFound', code, pendingCode: code }
      setCheckInState(nextState)
      setScannerState(nextState)
      pushToast('Unable to look up member', 'warning')
    }
  }

  const loadMembershipPlans = async () => {
    if (!isSupabaseReady || !session) return

    try {
      const plans = await dataService.getMembershipPlans()
      setMembershipPlans(plans)

      if (plans.length > 0) {
        setMemberForm((prev) => {
          const nextPlanId = prev.planId || plans[0].id
          const nextPlan = plans.find((plan) => plan.id === nextPlanId) || plans[0]

          return {
            ...prev,
            planId: nextPlan.id,
            plan: nextPlan.name,
            fee: String(prev.fee && Number(prev.fee) > 0 ? prev.fee : (Number(nextPlan.price) || 0)),
            startDate: prev.startDate || getTodayIsoKolkata(),
            expiryDate: prev.expiryDate || addDaysToIso(prev.startDate || getTodayIsoKolkata(), Number(nextPlan.duration_days || 30)),
          }
        })
      }
    } catch (err) {
      pushToast(err.message || 'Unable to load membership plans.', 'warning')
    }
  }

  const openAddMember = () => {
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
      pushToast('Please upload a profile photograph.', 'warning')
      return
    }

    try {
      setIsSubmittingMember(true)

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
      pushToast(err.message || 'Failed to add member.', 'warning')
    } finally {
      setIsSubmittingMember(false)
    }
  }

  const openEditMember = (member) => {
    if (!member) return
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
    if (!editPhotoSelection.file && !editMemberForm.photo) {
      pushToast('Please upload a profile photograph.', 'warning')
      return
    }

    setIsSavingMember(true)
    try {
      const updated = await dataService.editMember(editMemberId, {
        full_name: editMemberForm.fullName,
        phone: editMemberForm.phone,
        photoFile: editPhotoSelection.file,
      })

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
      pushToast(err.message || 'Failed to update member.', 'warning')
    } finally {
      setIsSavingMember(false)
    }
  }

  const openWhatsAppActions = async () => {
    setShowWhatsAppActions(true)
    setIsCheckingWhatsApp(true)
    setIsWhatsAppConfigured(false)
    try {
      const status = await getWhatsAppIntegrationStatus()
      setIsWhatsAppConfigured(status.configured)
    } finally {
      setIsCheckingWhatsApp(false)
    }
  }

  const handleWhatsAppNotification = async (eventType) => {
    if (!selectedMember || !isWhatsAppConfigured || sendingWhatsAppEvent) return
    setSendingWhatsAppEvent(eventType)
    try {
      const result = await sendWhatsAppNotification(selectedMember.memberId, eventType)
      if (result.sent) pushToast('WhatsApp message accepted by the provider', 'success')
      else pushToast('WhatsApp message was not sent.', 'warning')
    } catch (error) {
      pushToast(error.message || 'WhatsApp message was not sent.', 'warning')
    } finally {
      setSendingWhatsAppEvent('')
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
      await dataService.recordPayment(paymentForm)
      const nextPayments = await dataService.getPaymentsFromSupabase()
      setPayments(nextPayments)
      setShowPaymentModal(false)
      pushToast('Payment recorded successfully', 'success')
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

  const renderDashboard = () => {
    const hour = Number(new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(dashboardClock))
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const todayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(dashboardClock)
    const revenuePeak = Math.max(1, ...weeklyRevenue.map((day) => day.amount))
    const recentPayments = payments.slice(0, 5)

    return (
      <div className="page-shell dashboard-page">
        <div className="mode-banner">
          {!isSupabaseReady && <span className="demo-badge">Demo data</span>}
          {appConfig.isMockMode ? 'Development mock mode' : 'Production mode • Connected services'}
        </div>

        <header className="dashboard-header">
          <div>
            <p className="eyebrow">{greeting}, Owner</p>
            <h1>Dashboard</h1>
            <p className="dashboard-date"><CalendarDays size={15} /> {todayLabel}</p>
          </div>
          <div className="dashboard-actions">
            <button type="button" className="primary-button" onClick={openAddMember}><UserRoundPlus size={17} /> Add member</button>
            <button type="button" className="secondary-button" onClick={() => { setCurrentView('scan'); setCheckInState({ type: 'idle' }) }}><ScanLine size={17} /> Attendance</button>
            <button type="button" className="secondary-button" onClick={openPaymentModal}><CreditCard size={17} /> Record payment</button>
            <button type="button" className="secondary-button" onClick={() => setCurrentView('members')}><UsersRound size={17} /> Members</button>
          </div>
        </header>

        <section className="dashboard-kpis" aria-label="Gym performance">
          <article className="dashboard-kpi">
            <div className="kpi-heading"><span>Total Members</span><UsersRound size={18} /></div>
            <strong>{summary.totalMembers.toLocaleString('en-IN')}</strong>
            <small>Registered member records</small>
          </article>
          <article className="dashboard-kpi">
            <div className="kpi-heading"><span>Active Members</span><Activity size={18} /></div>
            <strong>{summary.activeMembers.toLocaleString('en-IN')}</strong>
            <small>Membership active today</small>
          </article>
          <article className="dashboard-kpi">
            <div className="kpi-heading"><span>Today&apos;s Attendance</span><CalendarCheck2 size={18} /></div>
            <strong>{summary.todayAttendanceCount.toLocaleString('en-IN')}</strong>
            <small>Check-ins recorded today</small>
          </article>
          <article className="dashboard-kpi revenue-kpi">
            <div className="kpi-heading"><span>Today&apos;s Revenue</span><CircleDollarSign size={18} /></div>
            <strong>{formatCurrency(todayRevenue)}</strong>
            <small>Payments received today</small>
          </article>
        </section>

        <section className="dashboard-overview-grid">
          <article className="dashboard-panel attendance-overview">
            <div className="dashboard-panel-heading">
              <div><p className="section-kicker">Floor activity</p><h2>Recent attendance</h2></div>
              <button type="button" className="text-action" onClick={() => setCurrentView('scan')}>Open reception <ArrowUpRight size={15} /></button>
            </div>
            {todayAttendance.length ? todayAttendance.slice(0, 6).map((person) => (
              <div key={person.memberId} className="dashboard-list-row">
                <MemberPhoto path={person.photo} name={person.name} size="compact" />
                <div className="dashboard-row-main"><strong>{person.name}</strong><span>Member #{person.memberId}</span></div>
                <span className="dashboard-row-time"><Clock3 size={14} /> {person.time}</span>
                <span className="status-pill status-success">Present</span>
              </div>
            )) : <p className="dashboard-empty">No attendance recorded today.</p>}
          </article>

          <article className="dashboard-panel revenue-overview">
            <div className="dashboard-panel-heading">
              <div><p className="section-kicker">Collected payments</p><h2>Revenue overview</h2></div>
              <strong className="revenue-total">{formatCurrency(weeklyRevenue.reduce((total, day) => total + day.amount, 0))}</strong>
            </div>
            <div className="revenue-chart" aria-label="Paid revenue for the last seven days">
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
          <article className="dashboard-panel expiring-overview">
            <div className="dashboard-panel-heading">
              <div><p className="section-kicker">Membership health</p><h2>Expiring soon</h2></div>
              <span className="count-label">{expiringSoon.length} upcoming</span>
            </div>
            {expiringSoon.length ? expiringSoon.map((member) => (
              <div className="expiring-member-row" key={member.memberId}>
                <MemberPhoto path={member.photo} name={member.name} size="compact" />
                <div className="dashboard-row-main"><strong>{member.name}</strong><span>#{member.memberId} · {member.plan}</span></div>
                <div className="expiring-date"><strong>{formatDate(member.expiryDate)}</strong><span>{member.daysLeft === 0 ? 'Expires today' : `${member.daysLeft} ${member.daysLeft === 1 ? 'day' : 'days'} left`}</span></div>
                <button type="button" className="icon-action" aria-label={`View ${member.name}`} title="View member" onClick={() => { selectMember(member.memberId); setCurrentView('members') }}><ArrowUpRight size={17} /></button>
              </div>
            )) : <p className="dashboard-empty">No memberships are expiring soon.</p>}
          </article>

          <article className="dashboard-panel payments-overview">
            <div className="dashboard-panel-heading">
              <div><p className="section-kicker">Cash flow</p><h2>Recent payments</h2></div>
              <button type="button" className="text-action" onClick={() => setCurrentView('payments')}>All payments <ArrowUpRight size={15} /></button>
            </div>
            {recentPayments.length ? recentPayments.map((payment) => (
              <div className="payment-overview-row" key={payment.id || `${payment.receiptNumber}-${payment.date}`}>
                <div className="payment-mark"><WalletCards size={17} /></div>
                <div className="dashboard-row-main"><strong>{payment.member}</strong><span>{payment.method} · {payment.receiptNumber || 'Receipt unavailable'}</span></div>
                <div className="payment-amount"><strong>{formatCurrency(payment.amount)}</strong><span>{formatDate(payment.date)}</span></div>
              </div>
            )) : <p className="dashboard-empty">No payments recorded yet.</p>}
          </article>
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
      onRenew={(member) => openRenewalModal(member)}
      onAllowExpiredConfirm={(member) => {
        setCheckInState({ type: 'confirmExpiredAttendance', member, pendingCode: member.memberId })
        setScannerState({ type: 'confirmExpiredAttendance', member, pendingCode: member.memberId })
      }}
      onNextMember={() => {
        const nextState = { type: 'idle' }
        setCheckInState(nextState)
        setScannerState(nextState)
      }}
      onCancelExpiredConfirm={() => {
        const nextState = { type: 'idle' }
        setCheckInState(nextState)
        setScannerState(nextState)
      }}
    />
  )

  const renderMembersPage = () => (
    <div className="page-shell">
      <header className="topbar compact-header">
        <div>
          <p className="eyebrow">Member directory</p>
          <h1>Members</h1>
        </div>
        <button type="button" className="primary-button" onClick={openAddMember}>
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
                <MemberPhoto path={member.photo} name={member.name} size="compact" />
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
              <button type="button" className="secondary-button full" onClick={() => selectMember(member.memberId)}>
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
                <div className="info-block"><span className="info-label">Today</span><strong>{selectedMember.attendanceHistory.some((entry) => entry.date === TODAY_ISO) ? 'Present Today' : 'Not marked'}</strong></div>
              </div>
              <div className="qr-box">
                <div className="qr-preview" aria-label={`QR code for ${selectedMember.memberId}`}>
                  {Array.from({ length: 169 }).map((_, index) => (
                    <span key={index} className={`qr-cell ${index % 4 === 0 || index % 9 === 0 || (index % 11 === 0 && index % 3 === 0) ? 'filled' : ''}`} />
                  ))}
                </div>
                <div className="qr-text"><strong>Member QR</strong><span>{selectedMember.memberId}</span></div>
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
                {selectedMember.attendanceHistory.slice(0, 10).map((entry, index) => (
                  <div key={`${selectedMember.memberId}-${entry.date}-${index}`} className="history-item"><span>{formatDate(entry.date)}</span><span>{entry.time}</span><span>{entry.status}</span></div>
                ))}
                {!selectedMember.attendanceHistory.length && <p className="dashboard-empty">No attendance has been recorded.</p>}
              </div>
            </div>
          )}

          {memberProfileTab === 'Payments' && (
            <div className="history-panel profile-tab-content">
              <h3>Payment History</h3>
              <div className="history-list">
                {payments.filter((entry) => entry.memberCode === selectedMember.memberId).slice(0, 10).map((entry, index) => (
                  <div key={`${entry.receiptNumber || entry.member}-${index}`} className="history-item"><span>{formatDate(entry.date)}</span><span>{formatCurrency(entry.amount)}</span><span>{entry.method}</span></div>
                ))}
                {!payments.some((entry) => entry.memberCode === selectedMember.memberId) && <p className="dashboard-empty">No payments have been recorded.</p>}
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
        <StatsCard label="Active" value={visibleMembers.filter((member) => getMembershipStatus(member) === 'Active').length.toString()} accent="green" />
        <StatsCard label="Expiring Soon" value={visibleMembers.filter((member) => getMembershipStatus(member) === 'Expiring Soon').length.toString()} accent="amber" />
        <StatsCard label="Expired" value={visibleMembers.filter((member) => getMembershipStatus(member) === 'Expired').length.toString()} accent="red" />
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

  if (isSupabaseReady && session && isLoadingLiveData) {
    return (
      <div className="app-shell">
        <Sidebar navItems={visibleNavItems} currentView={currentView} onNavigate={setCurrentView} />
        <main className="main-panel">
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
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => selectMemberPhoto(event, setMemberPhotoSelection, pushToast)} />
                </label>
                <p className="field-help">Profile photo is required. JPG, PNG, or WEBP, up to 10 MB.</p>
                {memberPhotoSelection.previewUrl && (
                  <div className="photo-preview-row">
                    <img src={memberPhotoSelection.previewUrl} alt="Selected member profile" />
                    <span>{memberPhotoSelection.file?.name}</span>
                  </div>
                )}
              </div>

              <div className="button-row right-align">
                <button type="button" className="ghost-button" onClick={() => setShowAddMember(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={isSubmittingMember || membershipPlans.length === 0}>
                  {isSubmittingMember ? 'Saving…' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditMember && (
        <div className="modal-backdrop" onClick={() => setShowEditMember(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
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
                ) : editMemberForm.photo ? (
                  <MemberPhoto path={editMemberForm.photo} name={editMemberForm.fullName} size="compact" />
                ) : (
                  <p className="photo-missing-warning">Profile photo missing. Upload a photograph to save this profile.</p>
                )}
                <label>
                  <span>Replace photograph</span>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => selectMemberPhoto(event, setEditPhotoSelection, pushToast)} />
                </label>
                <p className="field-help">Leave this unchanged to keep the current photograph.</p>
              </div>

              <div className="button-row right-align">
                <button type="button" className="ghost-button" onClick={() => setShowEditMember(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={isSavingMember}>
                  {isSavingMember ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWhatsAppActions && (
        <div className="modal-backdrop" onClick={() => setShowWhatsAppActions(false)}>
          <div className="modal-card small-card whatsapp-actions-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>WhatsApp</h2>
              <button type="button" className="close-button" onClick={() => setShowWhatsAppActions(false)}>×</button>
            </div>
            {isCheckingWhatsApp ? (
              <p className="muted-copy">Checking server-side integration…</p>
            ) : !isWhatsAppConfigured ? (
              <p className="whatsapp-unconfigured">WhatsApp integration not configured</p>
            ) : (
              <div className="whatsapp-action-list">
                <button type="button" className="secondary-button" disabled={Boolean(sendingWhatsAppEvent)} onClick={() => handleWhatsAppNotification('membership_expiring_soon')}>
                  Send Renewal Reminder
                </button>
                <button type="button" className="secondary-button" disabled={Boolean(sendingWhatsAppEvent)} onClick={() => handleWhatsAppNotification('payment_reminder')}>
                  Send Payment Reminder
                </button>
                <button type="button" className="secondary-button" disabled={Boolean(sendingWhatsAppEvent)} onClick={() => handleWhatsAppNotification('membership_renewed')}>
                  Send Renewal Confirmation
                </button>
                <button type="button" className="secondary-button" disabled={Boolean(sendingWhatsAppEvent)} onClick={() => handleWhatsAppNotification('payment_received')}>
                  Send Payment Receipt
                </button>
                {sendingWhatsAppEvent && <p className="muted-copy">Waiting for provider confirmation…</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-backdrop" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-card small-card" onClick={(event) => event.stopPropagation()}>
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
              <button type="button" className="primary-button" onClick={confirmRenewal} disabled={isRenewingMembership}>
                {isRenewingMembership ? 'Saving…' : 'Confirm Renewal'}
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

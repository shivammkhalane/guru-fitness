import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, CheckCircle2, CreditCard, LayoutDashboard, LoaderCircle, LogOut, ScanLine, Settings2, UserRoundPlus, UsersRound, WalletCards, X, XCircle } from 'lucide-react'
import './App.css'
import './zinc-theme.css'
import Sidebar from './components/Sidebar'
import GlobalSearch from './components/GlobalSearch'
import ScrollUtilities from './components/ScrollUtilities'
import CopyButton from './components/CopyButton'
import useModalA11y from './hooks/useModalA11y'
import MemberModal from './components/MemberModal'
import ThemeToggle from './components/ThemeToggle'
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
import MemberLogin from './components/MemberLogin'
import MemberDashboard from './components/MemberDashboard'
import GymLeaderboard from './components/GymLeaderboard'
import PeakHoursHeatmap from './components/PeakHoursHeatmap'
import PeakHoursHeatmapGrid from './components/PeakHoursHeatmapGrid'
import MemberRetentionRadial from './components/MemberRetentionRadial'
import EquipmentStatusSparklines from './components/EquipmentStatusSparklines'
import ChurnRadar from './components/ChurnRadar'
import ExerciseDetail from './pages/ExerciseDetail'
import ExerciseLibrary from './pages/ExerciseLibrary'
import LandingPage from './components/LandingPage'
import PolicyPage from './pages/PolicyPage'
import NotFoundPage from './pages/NotFoundPage'
import useQRScanner from './hooks/useQRScanner'
import { appConfig } from './config/appConfig'
import { dataService } from './services/dataService'
import { isSupportedMemberPhoto, MAX_MEMBER_PHOTO_BYTES } from './services/memberPhotoService'
import { sendWhatsAppNotification } from './services/whatsappNotificationService'
import { dispatchExpiryReminders } from './services/whatsappAuthService'
import { sendMemberQrPass } from './services/qrPassService'
import { animate, stagger } from 'animejs'
import { curveLinear } from '@visx/curve'
import { AreaChart, Area } from './components/charts/area-chart'
import { Grid } from './components/charts/grid'
import { ChartTooltip } from './components/charts/tooltip/chart-tooltip'
import { XAxis } from './components/charts/x-axis'
import {
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
  displayMemberCode,
  formatCurrency,
  formatDate,
  getExpiringSoonMembers,
  getMembershipStatus,
  getTodayAttendance,
  getTodayIsoKolkata,
  toDateInputValue,
} from './utils/gymLogic'

const QRCodeCard = lazy(() => import('./components/QRCodeCard'))

const MEMBER_PAGE_SIZE = 24
const PAYMENT_PAGE_SIZE = 50

function formatMetricCount(value, currency) {
  return currency
    ? formatCurrency(Math.round(value))
    : Math.round(value).toLocaleString('en-IN')
}

function DashboardMetricCard({ label, countTo, detail, accent = false, currency = false }) {
  const countRef = useRef(null)

  useEffect(() => {
    if (countTo == null || !countRef.current) return undefined

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      countRef.current.textContent = formatMetricCount(countTo, currency)
      return undefined
    }

    const counter = { value: 0 }
    const animation = animate(counter, {
      value: countTo,
      duration: 900,
      ease: 'outExpo',
      onUpdate: () => {
        if (countRef.current) {
          countRef.current.textContent = formatMetricCount(counter.value, currency)
        }
      },
    })

    return () => animation.cancel()
  }, [countTo, currency])

  const setSpotlightPosition = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`)
    event.currentTarget.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`)
  }

  return (
    <article
      className={`admin-metric-card${accent ? ' admin-metric-card-accent' : ''}`}
      onMouseMove={setSpotlightPosition}
    >
      <span className="admin-metric-label">{label}</span>
      <strong ref={countRef}>{countTo == null ? '—' : formatMetricCount(countTo, currency)}</strong>
      <small>{detail}</small>
    </article>
  )
}

function DashboardQuickActions({ onOpenAddMember, onNavigate, onOpenPayment }) {
  const actionsRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const paths = actionsRef.current?.querySelectorAll('svg path')
    if (!paths?.length) return undefined

    const animations = Array.from(paths, (path, index) => {
      if (typeof path.getTotalLength !== 'function') return null
      const length = path.getTotalLength()
      path.style.strokeDasharray = `${length}`
      path.style.strokeDashoffset = `${length}`
      return animate(path, {
        strokeDashoffset: [length, 0],
        duration: 560,
        delay: index * 35,
        ease: 'outExpo',
      })
    }).filter(Boolean)

    return () => animations.forEach((animation) => animation.cancel())
  }, [])

  return (
    <nav ref={actionsRef} className="admin-quick-actions" aria-label="Quick actions">
      <button type="button" onClick={onOpenAddMember}>
        <UserRoundPlus size={17} /> <span>Add Member</span>
      </button>
      <button type="button" onClick={() => onNavigate('attendance')}>
        <ScanLine size={17} /> <span>Scan QR</span>
      </button>
      <button type="button" onClick={onOpenPayment}>
        <CreditCard size={17} /> <span>Record Payment</span>
      </button>
    </nav>
  )
}

function DashboardRevenueChart({ weeklyRevenue, revenueDateRange }) {
  const chartRef = useRef(null)
  const chartData = useMemo(
    () => weeklyRevenue.map((day) => ({
      date: new Date(`${day.date}T00:00:00.000Z`),
      revenue: day.amount,
    })),
    [weeklyRevenue],
  )
  const dateLabels = useMemo(() => weeklyRevenue.map((day) => day.label), [weeklyRevenue])

  useEffect(() => {
    if (!chartRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const animation = animate(chartRef.current, {
      opacity: [0, 1],
      translateY: [15, 0],
      duration: 800,
      ease: 'outExpo',
    })
    return () => animation.cancel()
  }, [])

  return (
    <div
      ref={chartRef}
      className="revenue-chart"
      role="img"
      aria-label={`Paid revenue from ${revenueDateRange.start} through ${revenueDateRange.end}`}
    >
      {chartData.length ? (
        <AreaChart
          data={chartData}
          xDataKey="date"
          className="revenue-area-chart"
          margin={{ top: 12, right: 40, bottom: 28, left: 40 }}
          style={{ height: 190, touchAction: 'pan-y' }}
          animationDuration={800}
        >
          <Grid horizontal numTicksRows={4} stroke="var(--chart-grid)" strokeOpacity={0.7} />
          <Area
            dataKey="revenue"
            curve={curveLinear}
            fill="var(--chart-line-primary)"
            stroke="var(--chart-line-primary)"
            fillOpacity={0.14}
            gradientToOpacity={0}
          />
          <XAxis labels={dateLabels} numTicks={5} />
          <ChartTooltip
            dateLabels={dateLabels}
            rows={(point) => [{
              color: 'var(--chart-line-primary)',
              label: 'Paid revenue',
              value: formatCurrency(point.revenue),
            }]}
          />
        </AreaChart>
      ) : (
        <p className="dashboard-empty">Choose a valid date range.</p>
      )}
    </div>
  )
}

function DashboardActivityFeed({ attendance, members }) {
  const listRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const items = listRef.current?.querySelectorAll('.activity-item')
    if (!items?.length) return undefined

    const animation = animate(items, {
      translateY: [20, 0],
      opacity: [0, 1],
      delay: stagger(100),
      duration: 700,
      ease: 'outExpo',
    })
    return () => animation.cancel()
  }, [attendance])

  if (!attendance.length) return <p className="dashboard-empty">No check-ins recorded today.</p>

  return (
    <ul className="admin-activity-list" ref={listRef}>
      {attendance.slice(0, 5).map((person) => {
        const member = members.find((entry) => displayMemberCode(entry) === String(person.memberId))
        return (
          <li className="admin-activity-row activity-item" key={`${person.memberId}-${person.time}`}>
            <Avatar name={person.name} small />
            <div className="dashboard-row-main"><strong>{person.name}</strong><span>{member?.plan || '—'}</span></div>
            <span className="recent-checkin-time">{person.time}</span>
          </li>
        )
      })}
    </ul>
  )
}

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

const handleReviewMemberDataRequest = async (requestId) => {
  try {
    const { data, error } = await supabase
      .from('member_data_requests')
      .update({ status: 'in_review', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('The request changed before it could be updated. Refresh and try again.')
    setMemberDataRequests((previous) => previous.map((request) => (
      request.id === requestId ? { ...request, status: 'in_review', updated_at: new Date().toISOString() } : request
    )))
  } catch (error) {
    setMemberDataRequestsError(error.message || 'Could not update request status.')
  }
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
    whatsappPassConsent: true,
    photo: '',
  }
}

function DashboardApp() {
  const location = useLocation()
  const { id: exerciseRouteId } = useParams()
  const routePath = (location.pathname.replace(/^\/admin(?=\/|$)/, '').replace(/\/+$/, '') || '/')
  const [members, setMembers] = useState(() => (isSupabaseReady ? [] : dataService.getMembers()))
  const [payments, setPayments] = useState(() => (isSupabaseReady ? [] : dataService.getPayments()))
  const [ledgerSummary, setLedgerSummary] = useState(null)
  const [settings, setSettings] = useState(() => (
    isSupabaseReady
      ? { gymName: '', monthlyMembership: 0, phone: '', city: '', address: '' }
      : dataService.getSettings()
  ))
  const [membershipPlans, setMembershipPlans] = useState([])
  const [activeTab, setActiveTabState] = useState(() => (
    routePath === '/library' || routePath.startsWith('/exercise/') ? 'exercises' : 'dashboard'
  ))
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
  const [editMemberForm, setEditMemberForm] = useState({ fullName: '', phone: '', photo: '', whatsappPassConsent: false })
  const [renewalForm, setRenewalForm] = useState({
    amount: 500,
    expiryDate: getTodayIsoKolkata(),
    planId: null,
  })
  const [session, setSession] = useState(null)
  const [profileRole, setProfileRole] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [authLoading, setAuthLoading] = useState(() => isSupabaseReady)
  const [dashboardClock] = useState(() => new Date())
  const [revenueDateRange, setRevenueDateRange] = useState(() => {
    const end = getTodayIsoKolkata()
    return { start: addDaysToIso(end, -6), end }
  })
  const [authError, setAuthError] = useState('')
  const [isLoadingLiveData, setIsLoadingLiveData] = useState(false)
  const [liveDataError, setLiveDataError] = useState('')
  const [liveDataRetryToken, setLiveDataRetryToken] = useState(0)
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false)
  const [isSubmittingMember, setIsSubmittingMember] = useState(false)
  const [isSavingMember, setIsSavingMember] = useState(false)
  const [isSendingWhatsAppReminder, setIsSendingWhatsAppReminder] = useState(false)
  const [isSendingBulkReminders, setIsSendingBulkReminders] = useState(false)
  const [isRenewingMembership, setIsRenewingMembership] = useState(false)
  const [memberPhotoSelection, setMemberPhotoSelection] = useState({ file: null, previewUrl: '' })
  const [editPhotoSelection, setEditPhotoSelection] = useState({ file: null, previewUrl: '' })
  const [memberPhotoError, setMemberPhotoError] = useState('')
  const [memberModalErrors, setMemberModalErrors] = useState({})
  const [qrPassSendingMemberId, setQrPassSendingMemberId] = useState(null)
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
  const [memberDataRequests, setMemberDataRequests] = useState([])
  const [memberDataRequestsError, setMemberDataRequestsError] = useState('')
  const [isLoadingMemberDataRequests, setIsLoadingMemberDataRequests] = useState(false)
  const qrScanSequenceRef = useRef(0)
  const editMemberDialogRef = useRef(null)
  const whatsappDialogRef = useRef(null)
  const paymentDialogRef = useRef(null)
  const renewalDialogRef = useRef(null)
  const userRole = isSupabaseReady ? profileRole : 'demo'

  useModalA11y(showEditMember, editMemberDialogRef, () => setShowEditMember(false))
  useModalA11y(showWhatsAppActions, whatsappDialogRef, () => setShowWhatsAppActions(false))
  useModalA11y(showPaymentModal, paymentDialogRef, () => setShowPaymentModal(false))
  useModalA11y(showRenewModal, renewalDialogRef, () => setShowRenewModal(false))

  useEffect(() => {
    if (!isSupabaseReady || !session || activeTab !== 'settings' || !['owner', 'admin'].includes(userRole)) return undefined
    let cancelled = false

    const loadRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('member_data_requests')
          .select('id, request_type, status, created_at, member:members(full_name, member_code)')
          .order('created_at', { ascending: false })
          .limit(50)
        if (error) throw error
        if (!cancelled) setMemberDataRequests(data || [])
      } catch (error) {
        if (!cancelled) setMemberDataRequestsError(error.message || 'Could not load member data requests.')
      } finally {
        if (!cancelled) setIsLoadingMemberDataRequests(false)
      }
    }

    loadRequests()
    return () => { cancelled = true }
  }, [activeTab, session, userRole])

  const currentView = activeTab === 'attendance' ? 'scan' : activeTab
  const setActiveTab = (tab) => {
    setMobileNavOpen(false)
    setActiveTabState(tab === 'scan' ? 'attendance' : tab)
    if (tab === 'settings' && isSupabaseReady && ['owner', 'admin'].includes(userRole)) {
      setMemberDataRequestsError('')
      setIsLoadingMemberDataRequests(true)
    }
    if (tab === 'scan' || tab === 'attendance') {
      setCheckInState({ type: 'idle' })
    }
  }
  const setCurrentView = setActiveTab

  useEffect(() => {
    const titles = {
      '/': 'Gym management | Guru Fitness OS',
      '/library': 'Exercise library | Guru Fitness OS',
    }
    document.title = routePath.startsWith('/exercise/')
      ? 'Exercise details | Guru Fitness OS'
      : (titles[routePath] || 'Gym management | Guru Fitness OS')
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, nofollow')
  }, [routePath])

  useEffect(() => {
    if (!isSupabaseReady) return

    let cancelled = false

    const restoreSession = async () => {
      try {
        const { data, error } = await getCurrentSession()
        if (error) throw error
        const restoredSession = data?.session || null
        if (!restoredSession) {
          if (!cancelled) setSession(null)
          return
        }
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', restoredSession.user.id)
          .maybeSingle()
        if (profileError) throw profileError
        if (!profile || !['owner', 'admin', 'staff'].includes(profile.role)) {
          await signOut()
          if (!cancelled) {
            setAuthError('This account has not been assigned gym staff access. Ask an authorized gym administrator to provision it.')
            setSession(null)
          }
          return
        }
        if (!cancelled) {
          setProfileRole(profile.role)
          setSession(restoredSession)
        }
      } catch (error) {
        if (!cancelled) setAuthError(error.message || 'Unable to restore the signed-in account.')
      } finally {
        if (!cancelled) setAuthLoading(false)
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
        if (Array.isArray(sbPlans) && sbPlans.length) {
          setSettings((prev) => ({ ...prev, monthlyMembership: Number(sbPlans[0].price) || 0 }))
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
  }, [session, liveDataRetryToken])


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
    setProfileRole('')

    try {
      const result = await signInWithEmail(email, password)
      if (!result.session?.user) throw new Error('Sign-in did not return an authenticated session.')
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', result.session.user.id)
        .maybeSingle()
      if (profileError) throw profileError
      if (!profile || !['owner', 'admin', 'staff'].includes(profile.role)) {
        await signOut()
        throw new Error('This account has not been assigned gym staff access. Ask an authorized gym administrator to provision it.')
      }
      setProfileRole(profile.role)
      setSession(result.session)
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
    setProfileRole('')

    try {
      const result = await signUpWithEmail(email, password, { full_name: fullName })
      if (result.session) {
        await signOut()
      }
      setAuthError('Account registration does not grant gym access. An authorized administrator must provision your staff role before you can sign in.')
    } catch (error) {
      setAuthError(error.message || 'Unable to sign up. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleDemoContinue = () => {
    setSession({ user: { email: 'Local demo', app_metadata: { role: 'demo' } } })
    setAuthLoading(false)
    setAuthError('')
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } finally {
      setProfileRole('')
      setSession(null)
    }
  }

  const visibleNavItems = userRole === 'staff'
    ? navItems.filter((item) => !['settings', 'payments'].includes(item.key))
    : ['owner', 'admin', 'demo'].includes(userRole)
      ? navItems
      : []

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
  const weeklyRevenue = useMemo(() => {
    if (!revenueDateRange.start || !revenueDateRange.end || revenueDateRange.start > revenueDateRange.end) return []
    const days = []
    const date = new Date(`${revenueDateRange.start}T00:00:00Z`)
    const endDate = new Date(`${revenueDateRange.end}T00:00:00Z`)
    while (date <= endDate) {
      const isoDate = date.toISOString().slice(0, 10)
      days.push({
        date: isoDate,
        label: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date),
        amount: paidRevenueByDate.get(isoDate) || 0,
      })
      date.setUTCDate(date.getUTCDate() + 1)
    }
    return days
  }, [paidRevenueByDate, revenueDateRange])

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

  const deliverMemberQrPass = async (member, successMessage = 'QR pass sent by WhatsApp') => {
    if (!member) return false
    if (!member.whatsappPassConsent) {
      pushToast('WhatsApp QR pass not sent; member permission has not been recorded.', 'warning')
      return false
    }
    setQrPassSendingMemberId(member.memberId)
    try {
      const res = await sendMemberQrPass(member)
      if (res && res.success) {
        pushToast(successMessage || '✅ QR pass delivered via WhatsApp!', 'success')
        return true
      } else {
        throw new Error(res?.message || 'WhatsApp QR pass was not sent.')
      }
    } catch (error) {
      console.error('QR pass delivery failed:', error)
      pushToast(error instanceof Error ? `WhatsApp pass not sent: ${error.message}` : 'WhatsApp pass was not sent.', 'warning')
      return false
    } finally {
      setQrPassSendingMemberId(null)
    }
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
    enabled: Boolean(session && !authLoading && !isLoadingLiveData && currentView === 'dashboard'),
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
      const renewedMember = members.find((member) => member.memberId === renewMemberId)
      await dataService.renewMembership(renewMemberId, {
        amount: renewalForm.amount,
        expiryDate: renewalForm.expiryDate,
        planId: renewalForm.planId,
      })

      if (isSupabaseReady && renewedMember?.whatsappPassConsent) {
        void deliverMemberQrPass({
          ...renewedMember,
          expiryDate: renewalForm.expiryDate,
        })
      }

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

  const openAddMember = () => {
    setMemberPhotoError('')
    setMemberModalErrors({})
    setMemberPhotoSelection((previous) => {
      if (previous.previewUrl) URL.revokeObjectURL(previous.previewUrl)
      return { file: null, previewUrl: '' }
    })
    setShowAddMember(true)
  }

  const handleAddMember = async (event) => {
    event.preventDefault()
    if (isSubmittingMember) return

    const normalizedPhone = normalizeIndianPhone(memberForm.phone)
    const fee = memberForm.fee === '' ? Number.NaN : Number(memberForm.fee)
    const validationErrors = {}
    if (!memberForm.fullName.trim()) validationErrors.fullName = 'Name is required.'
    if (!/^91[6-9]\d{9}$/.test(normalizedPhone)) validationErrors.phone = 'Enter a valid Indian mobile number.'
    if (!membershipPlans.some((plan) => plan.id === memberForm.planId)) validationErrors.planId = 'Select a membership plan.'
    if (!Number.isFinite(fee) || fee < 0) validationErrors.fee = 'Enter a fee of 0 or more.'
    setMemberModalErrors(validationErrors)
    if (Object.keys(validationErrors).length) return

    if (!memberPhotoSelection.file) {
      const message = 'Choose a profile photograph before registering this member.'
      setMemberPhotoError(message)
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
        phone: normalizedPhone,
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
        whatsappPassConsent: memberForm.whatsappPassConsent,
      })
      setMembers((prev) => [created, ...prev.filter((member) => member.memberId !== created.memberId)])

      selectMember(created.memberId)
      setShowAddMember(false)
      setMemberForm(makeMemberForm())
      setMemberModalErrors({})
      setMemberPhotoSelection((previous) => {
        if (previous.previewUrl) URL.revokeObjectURL(previous.previewUrl)
        return { file: null, previewUrl: '' }
      })
      setCurrentView('members')
      pushToast(
        memberForm.whatsappPassConsent
          ? 'Member added successfully; QR pass delivery is starting.'
          : 'Member added successfully. WhatsApp QR pass was not sent because permission was not recorded.',
        memberForm.whatsappPassConsent ? 'success' : 'warning',
      )

      if (memberForm.whatsappPassConsent) void deliverMemberQrPass(created, '')

      if (isSupabaseReady && session) {
        void (async () => {
          try {
            const [nextMembers, nextPayments] = await Promise.all([
              dataService.getMembersFromSupabase(),
              dataService.getPaymentsFromSupabase(),
            ])
            setMembers(nextMembers)
            setPayments(nextPayments)
          } catch (error) {
            console.warn('Member was saved, but the member list refresh failed:', error)
          }
        })()
      }
    } catch (err) {
      const message = err.message || 'Failed to add member.'
      setMemberModalErrors({ form: message })
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
      whatsappPassConsent: member.whatsappPassConsent === true,
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
        whatsappPassConsent: editMemberForm.whatsappPassConsent,
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
    const digits = String(phone).replace(/\D/g, '')
    const nationalNumber = digits.length === 10 ? digits : digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : ''
    return /^[6-9]\d{9}$/.test(nationalNumber) ? `91${nationalNumber}` : digits
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
    try {
      if (!selectedMember || !selectedMember.phone) {
        pushToast('Member phone number is required for WhatsApp.', 'warning')
        return
      }
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

  /**
   * Scans all active members, finds those expiring within 7 days,
   * and sends each a WhatsApp expiry reminder via Meta Cloud API.
   */
  const handleDispatchExpiryReminders = async (windowDays = 7) => {
    if (isSendingBulkReminders) return
    const candidates = members.filter((m) => m.phone && m.expiryDate && m.status !== 'archived')
    if (!candidates.length) {
      pushToast('No active members with a phone number found.', 'warning')
      return
    }
    setIsSendingBulkReminders(true)
    pushToast(`Scanning ${candidates.length} members for upcoming expiries…`, 'info')
    try {
      const summary = await dispatchExpiryReminders(
        candidates.map((m) => ({
          memberCode: m.memberCode || m.memberId,
          name: m.name,
          expiryDate: m.expiryDate,
        })),
        windowDays,
      )
      if (summary.sent === 0 && summary.failed === 0) {
        pushToast(`No members expire within ${windowDays} days — no reminders sent.`, 'info')
      } else if (summary.failed > 0) {
        pushToast(
          `Reminders: ${summary.sent} sent, ${summary.failed} failed, ${summary.skipped} skipped.`,
          summary.sent > 0 ? 'warning' : 'warning',
        )
      } else {
        pushToast(`✅ ${summary.sent} expiry reminder${summary.sent === 1 ? '' : 's'} sent successfully!`, 'success')
      }
    } catch (err) {
      pushToast(err.message || 'Bulk reminder dispatch failed.', 'warning')
    } finally {
      setIsSendingBulkReminders(false)
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
      Active: 'badge-active',
      'Expiring Soon': 'badge-expiring',
      Expired: 'badge-expired',
    }

    return <span className={`status-pill ${classNames[value] || ''}`}>{value}</span>
  }

  const renderDashboard = ({ onOpenAddMember, onNavigate }) => {
    const todayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(dashboardClock)
    const recentPayments = payments.slice(0, 5)

    return (
      <div className="admin-dashboard">
        <header className="admin-dashboard-topbar">
          <div className="admin-dashboard-brand">
            <span className="admin-dashboard-mark" aria-hidden="true">GF</span>
            <div>
              <strong>Guru Fitness</strong>
              <small>Admin console</small>
            </div>
          </div>
          <GlobalSearch
            navItems={visibleNavItems}
            members={visibleMembers}
            onNavigate={onNavigate}
            onSelectMember={selectMember}
          />
          <div className="admin-dashboard-account">
            <ThemeToggle />
            <details className="admin-profile-menu">
              <summary aria-label="Open account menu">
                <span className="admin-profile-avatar">{(session?.user?.email || 'GF').slice(0, 1).toUpperCase()}</span>
                <span className="admin-profile-copy">
                  <strong>{session?.user?.email || 'Demo session'}</strong>
                  <small>{userRole === 'demo' ? 'Local session' : userRole || 'Gym account'}</small>
                </span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </summary>
              <div className="admin-profile-dropdown">
                <span>{session?.user?.email || 'Demo session'}</span>
                <small>{userRole === 'demo' ? 'Local session' : userRole || 'Gym account'}</small>
                <button type="button" onClick={handleLogout}><LogOut size={15} /> Sign out</button>
              </div>
            </details>
          </div>
        </header>

        <div className="admin-dashboard-content">
        <div className="admin-dashboard-status">
          {!isSupabaseReady && <span className="demo-badge">Demo data</span>}
          <span>{!isSupabaseReady || appConfig.isMockMode ? 'Local demo mode' : 'Production mode · Connected services'}</span>
        </div>

        <section className="admin-dashboard-heading">
          <div>
            <p className="admin-dashboard-eyebrow">{settings.gymName || 'Guru Fitness Health Club'}</p>
            <h1>Gym overview</h1>
            <p><CalendarDays size={15} /> {todayLabel}</p>
          </div>
        </section>

        <DashboardQuickActions
          onOpenAddMember={onOpenAddMember}
          onNavigate={onNavigate}
          onOpenPayment={openPaymentModal}
        />

        <section
          className="admin-dashboard-metrics"
          aria-label="Gym performance"
        >
          <DashboardMetricCard label="Total members" countTo={visibleMembers.length} detail={`${summary.activeMembers.toLocaleString('en-IN')} active today`} />
          <DashboardMetricCard label="Today's check-ins" countTo={summary.todayAttendanceCount} detail="Recorded so far today" accent />
          <DashboardMetricCard label="Revenue collected" countTo={ledgerSummary?.revenueCollected ?? null} currency detail={`Today: ${formatCurrency(todayRevenue)}`} />
          <DashboardMetricCard label="Pending renewals" countTo={summary.expiringSoonCount} detail="Memberships nearing expiry" />
        </section>

        <PeakHoursHeatmapGrid />

        <section className="admin-dashboard-widgets grid grid-cols-1 md:grid-cols-2 gap-6">
          <MemberRetentionRadial />
          <EquipmentStatusSparklines />
        </section>

        <section className="admin-dashboard-overview">
          <article className="admin-glass-panel revenue-overview">
            <div className="admin-panel-heading">
              <div className="admin-revenue-heading">
                <div><p className="admin-panel-kicker">Revenue</p><h2>Revenue by day</h2></div>
                <strong className="revenue-total">{formatCurrency(weeklyRevenue.reduce((total, day) => total + day.amount, 0))}</strong>
              </div>
              <div className="revenue-date-range">
                <label>From <input className="input" type="date" value={revenueDateRange.start} max={revenueDateRange.end || todayIso} onChange={(event) => setRevenueDateRange((previous) => ({ ...previous, start: event.target.value }))} /></label>
                <label>To <input className="input" type="date" value={revenueDateRange.end} min={revenueDateRange.start} max={todayIso} onChange={(event) => setRevenueDateRange((previous) => ({ ...previous, end: event.target.value }))} /></label>
              </div>
            </div>
            <DashboardRevenueChart
              weeklyRevenue={weeklyRevenue}
              revenueDateRange={revenueDateRange}
            />
          </article>

          <article className="admin-glass-panel attendance-overview">
            <div className="admin-panel-heading">
              <div><p className="admin-panel-kicker">Today</p><h2>Recent check-ins</h2></div>
              <button type="button" className="admin-text-action" onClick={() => onNavigate('attendance')}>View all <ArrowUpRight size={15} /></button>
            </div>
            <DashboardActivityFeed attendance={todayAttendance} members={visibleMembers} />
          </article>
        </section>

        <section className="admin-dashboard-lower">
          <article className="admin-glass-panel expiring-overview">
            <div className="admin-panel-heading">
              <div><p className="admin-panel-kicker">Membership health</p><h2>Expiring soon</h2></div>
              <button type="button" className="admin-text-action" onClick={() => { setMemberFilter('Expiring Soon'); setMembersPage(1); onNavigate('members') }}>View all <ArrowUpRight size={15} /></button>
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

          <article className="admin-glass-panel payments-overview">
            <div className="admin-panel-heading">
              <div><p className="admin-panel-kicker">Cash flow</p><h2>Recent payments</h2></div>
              <button type="button" className="admin-text-action" onClick={() => onNavigate('payments')}>View all <ArrowUpRight size={15} /></button>
            </div>
            {recentPayments.length ? recentPayments.map((payment, index) => (
              <div className="payment-overview-row" key={payment.id || `${payment.receiptNumber || payment.memberId || payment.member || 'payment'}-${payment.date || 'undated'}-${index}`}>
                <div className="payment-mark"><WalletCards className="text-muted-foreground" size={17} /></div>
                <div className="dashboard-row-main"><strong>{payment.member}</strong><span>{payment.method}</span></div>
                <div className="payment-amount"><strong>{formatCurrency(payment.amount)}</strong><span>{formatDate(payment.date)}</span></div>
              </div>
            )) : <p className="dashboard-empty">No payments recorded yet.</p>}
          </article>
        </section>

        <section className="admin-dashboard-analytics" aria-label="Attendance analytics">
          <GymLeaderboard members={activeMembers} />
          <PeakHoursHeatmap attendance={todayAttendance} />
          {['owner', 'admin'].includes(userRole) && <ChurnRadar />}
        </section>
      </div>
      </div>
    )
  }

  const renderScanPage = () => (
    <CheckInView
      members={visibleMembers}
      todayAttendance={todayAttendance}
      checkInState={checkInState}
      isMarkingAttendance={isMarkingAttendance}
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
      onCopied={(label) => pushToast(`${label} copied`, 'success')}
      onCopyError={() => pushToast('Could not copy to clipboard. Check browser permissions.', 'warning')}
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
            {selectedMember.whatsappPassConsent ? (
              <button
                type="button"
                className="secondary-button"
                disabled={Boolean(qrPassSendingMemberId)}
                onClick={() => void deliverMemberQrPass(selectedMember)}
              >
                {qrPassSendingMemberId === selectedMember.memberId ? 'Sending QR pass…' : 'Resend QR pass'}
              </button>
            ) : (
              <span className="muted-copy">WhatsApp QR pass permission not recorded.</span>
            )}
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
            <button
              type="button"
              className="secondary-button"
              title={`Send expiry reminders to all members expiring within 7 days`}
              disabled={isSendingBulkReminders}
              onClick={() => void handleDispatchExpiryReminders(7)}
            >
              {isSendingBulkReminders ? 'Sending reminders…' : '📣 Send Expiry Reminders'}
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
        <StatsCard
          label={membershipPlans.length === 1 ? `${membershipPlans[0].name} Plan` : 'Lowest Active Plan'}
          value={membershipPlans.length ? formatCurrency(Math.min(...membershipPlans.map((plan) => Number(plan.price) || 0))) : '—'}
          accent="dark"
        />
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
                  <td>
                    {payment.receiptNumber ? (
                      <span className="copy-value">
                        {payment.receiptNumber}
                        <CopyButton
                          value={payment.receiptNumber}
                          label="receipt reference"
                          onCopied={() => pushToast('Receipt reference copied', 'success')}
                          onError={() => pushToast('Could not copy to clipboard. Check browser permissions.', 'warning')}
                        />
                      </span>
                    ) : '—'}
                  </td>
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
            <span>City</span>
            <input
              type="text"
              value={settings.city}
              onChange={(event) => setSettings((prev) => ({ ...prev, city: event.target.value }))}
            />
          </label>
        </div>

        <div className="button-row right-align">
          <button type="submit" className="primary-button">Save Changes</button>
        </div>
      </form>

      {isSupabaseReady && ['owner', 'admin'].includes(userRole) && (
        <section className="card data-request-admin-card" aria-labelledby="data-requests-title">
          <div>
            <h2 id="data-requests-title">Member data requests</h2>
            <p className="muted-copy">Review account-deletion requests from linked member accounts. Mark a request completed only after you have handled it under an owner-approved retention process.</p>
          </div>
          {memberDataRequestsError && <p className="member-portal-error" role="alert">{memberDataRequestsError}</p>}
          {isLoadingMemberDataRequests ? (
            <p role="status">Loading data requests…</p>
          ) : memberDataRequests.length ? (
            <ul className="data-request-admin-list">
              {memberDataRequests.map((request) => (
                <li key={request.id}>
                  <div>
                    <strong>{request.member?.full_name || 'Member record unavailable'}</strong>
                    <span>
                      {request.member?.member_code ? `Member #${request.member.member_code} · ` : ''}
                      {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(request.created_at))}
                    </span>
                    <small>Status: {request.status.replaceAll('_', ' ')}</small>
                  </div>
                  {request.status === 'pending' && (
                    <button type="button" className="btn-outline" onClick={() => handleReviewMemberDataRequest(request.id)}>
                      Mark in review
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p role="status">No member data requests have been submitted.</p>
          )}
          <p className="field-help">This app queues and tracks requests; it does not automatically erase financial, attendance, member, or authentication records. Apply the approved retention decision and mark completion in the protected Supabase database.</p>
        </section>
      )}

      <section className="card settings-appearance-row">
        <div>
          <h2>Appearance</h2>
          <p className="muted-copy">Choose light or dark mode for this device.</p>
        </div>
        <ThemeToggle />
      </section>
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
        return exerciseRouteId ? <ExerciseDetail /> : <ExerciseLibrary />
      case 'dashboard':
      default:
        return renderDashboard({ onOpenAddMember: openAddMember, onNavigate: setActiveTab })
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
      <div className="app-shell ios-light-shell flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar
          navItems={visibleNavItems}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAddMember={openAddMember}
          userEmail={session?.user?.email}
          userRole={userRole}
          onLogout={handleLogout}
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={() => setMobileNavOpen((isOpen) => !isOpen)}
        />
        <main className="main-panel flex-1 min-w-0">
            <a className="skip-to-content" href="#main-content">Skip to main content</a>
            <GlobalSearch
              navItems={visibleNavItems}
              members={visibleMembers}
              onNavigate={setActiveTab}
              onSelectMember={selectMember}
            />
            {!isSupabaseReady && (
              <div className="demo-data-notice" role="note">
                Demonstration data only — examples are stored in this browser and are not live gym records.
              </div>
            )}
            <div className="page-shell">
              <div className="mode-banner">
                <span className="loading-spinner" aria-hidden="true" />
                <span role="status">Loading live gym data…</span>
              </div>
              <div className="stats-grid" aria-hidden="true">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="stats-card skeleton-card" />
                ))}
              </div>
              <div className="member-list-grid" aria-hidden="true">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="member-card skeleton-card" />
                ))}
              </div>
            </div>
          </main>
          <ScrollUtilities />
        </div>
    )
  }

  return (
    <div className={`app-shell ios-light-shell flex h-screen bg-background text-foreground overflow-hidden admin-app-shell${mobileNavOpen ? ' mobile-nav-open' : ''}${currentView === 'dashboard' ? ' admin-dashboard-shell' : ''}`}>
        <a className="skip-to-content" href="#main-content">Skip to main content</a>
        <Sidebar
          navItems={visibleNavItems}
        activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpenAddMember={openAddMember}
      userEmail={session?.user?.email}
      userRole={userRole}
      onLogout={handleLogout}
      mobileNavOpen={mobileNavOpen}
      onToggleMobileNav={() => setMobileNavOpen((isOpen) => !isOpen)}
    />

    <main className="main-panel flex-1 min-w-0" id="main-content" tabIndex="-1">
        {currentView !== 'dashboard' && (
          <GlobalSearch
            navItems={visibleNavItems}
            members={visibleMembers}
            onNavigate={setActiveTab}
            onSelectMember={selectMember}
          />
        )}
        {!isSupabaseReady && (
          <div className="demo-data-notice" role="note">
            Demonstration data only — examples are stored in this browser and are not live gym records.
          </div>
        )}
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

      <nav className={`admin-mobile-nav${visibleNavItems.some((item) => item.key === 'settings') ? '' : ' admin-mobile-nav-limited'}`} aria-label="Mobile admin navigation">
        <button type="button" aria-current={activeTab === 'dashboard' ? 'page' : undefined} onClick={() => setActiveTab('dashboard')}>
          <LayoutDashboard size={19} /><span>Dashboard</span>
        </button>
        <button type="button" aria-current={activeTab === 'members' ? 'page' : undefined} onClick={() => setActiveTab('members')}>
          <UsersRound size={19} /><span>Members</span>
        </button>
        {visibleNavItems.some((item) => item.key === 'settings') && (
          <button type="button" aria-current={activeTab === 'settings' ? 'page' : undefined} onClick={() => setActiveTab('settings')}>
            <Settings2 size={19} /><span>Settings</span>
          </button>
        )}
      </nav>

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
        <MemberModal
          memberForm={memberForm}
          setMemberForm={setMemberForm}
          membershipPlans={membershipPlans}
          selectedPlan={selectedPlan}
          fieldErrors={memberModalErrors}
          photoSelection={memberPhotoSelection}
          photoError={memberPhotoError}
          isSubmitting={isSubmittingMember}
          onClose={() => setShowAddMember(false)}
          onSubmit={handleAddMember}
          onPhotoChange={(event) => selectMemberPhoto(event, setMemberPhotoSelection, setMemberPhotoError, pushToast)}
          getPlanExpiryDate={getPlanExpiryDate}
          getTodayIsoKolkata={getTodayIsoKolkata}
          toDateInputValue={toDateInputValue}
        />
      )}

      {showEditMember && (
        <div className="modal-backdrop modal-overlay backdrop-blur-sm" onClick={() => setShowEditMember(false)}>
          <div className="modal-card modal-panel" role="dialog" aria-modal="true" aria-labelledby="edit-member-title" ref={editMemberDialogRef} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 id="edit-member-title">Edit Member</h2>
              <button type="button" className="close-button" onClick={() => setShowEditMember(false)} aria-label="Close dialog">×</button>
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

              <label className="whatsapp-consent-field">
                <input
                  type="checkbox"
                  checked={Boolean(editMemberForm.whatsappPassConsent)}
                  onChange={(event) => setEditMemberForm((prev) => ({ ...prev, whatsappPassConsent: event.target.checked }))}
                />
                <span>
                  I have the member’s permission to send their QR image and membership expiry date to this number.
                </span>
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
        <div className="modal-backdrop modal-overlay backdrop-blur-sm" onClick={() => setShowWhatsAppActions(false)}>
          <div className="modal-card modal-panel small-card whatsapp-actions-modal" role="dialog" aria-modal="true" aria-labelledby="whatsapp-actions-title" ref={whatsappDialogRef} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 id="whatsapp-actions-title">WhatsApp</h2>
              <button type="button" className="close-button" onClick={() => setShowWhatsAppActions(false)} aria-label="Close dialog">×</button>
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
        <div className="modal-backdrop modal-overlay backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-card modal-panel small-card" role="dialog" aria-modal="true" aria-labelledby="record-payment-title" ref={paymentDialogRef} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 id="record-payment-title">Record Payment</h2>
              <button type="button" className="close-button" onClick={() => setShowPaymentModal(false)} aria-label="Close dialog">×</button>
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
        <div className="modal-backdrop modal-overlay backdrop-blur-sm" onClick={() => setShowRenewModal(false)}>
          <div className="modal-card modal-panel small-card" role="dialog" aria-modal="true" aria-labelledby="renew-membership-title" ref={renewalDialogRef} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 id="renew-membership-title">Renew Membership</h2>
              <button type="button" className="close-button" onClick={() => setShowRenewModal(false)} aria-label="Close dialog">×</button>
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

      <ToastList toasts={toasts} />
      <ScrollUtilities />
    </div>
  )
}

function LegacyExerciseRedirect() {
  const { id } = useParams()
  return <Navigate to={`/admin/exercise/${encodeURIComponent(id)}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<MemberLogin />} />
        <Route path="/member-login" element={<MemberLogin />} />
        <Route path="/app" element={<MemberLogin />} />
        <Route path="/member/*" element={<MemberDashboard />} />
        <Route path="/admin" element={<DashboardApp />} />
        <Route path="/owner" element={<DashboardApp />} />
        <Route path="/admin/exercise/:id" element={<DashboardApp />} />
        <Route path="/admin/*" element={<DashboardApp />} />
        <Route path="/library" element={<Navigate to="/admin/library" replace />} />
        <Route path="/exercise/:id" element={<LegacyExerciseRedirect />} />
        <Route path="/privacy" element={<PolicyPage />} />
        <Route path="/terms" element={<PolicyPage />} />
        <Route path="/cookies" element={<PolicyPage />} />
        <Route path="/refunds" element={<PolicyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, Apple, CalendarDays, CheckCircle2, Clock3, Dumbbell, LogOut, LockKeyhole, LoaderCircle, Phone, RefreshCw, Utensils } from 'lucide-react'
import { isSupabaseReady, supabase } from '../services/supabaseService'
import { formatCurrency, formatDate, getDaysUntilExpiry, getTodayIsoKolkata } from '../utils/gymLogic'
import LiveWorkoutSession from './LiveWorkoutSession'
import { PolicyFooter } from '../pages/PolicyPage'

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`
  return ''
}

const canonicalPhone = (value) => {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2)
  return digits
}

const getPlanTitle = (plan, fallback) => plan?.name || plan?.title || plan?.plan_name || fallback

const formatPlanValue = (value) => {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.map((item) => typeof item === 'object' ? JSON.stringify(item) : String(item)).join('\n')
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

const getPlanDetails = (plan) => {
  if (!plan) return []
  const excludedKeys = new Set([
    'id', 'gym_id', 'member_id', 'member_assignment_id', 'created_at', 'updated_at',
    'workout_plan_id', 'diet_plan_id', 'is_active', 'status',
  ])
  return Object.entries(plan)
    .filter(([key, value]) => !excludedKeys.has(key) && value != null && value !== '')
    .map(([key, value]) => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
      value: formatPlanValue(value),
    }))
}

const getAssignedWorkoutExercises = (plan) => {
    let routine = plan?.routine_data
    if (typeof routine === 'string') {
      try {
        routine = JSON.parse(routine)
      } catch {
        return { exercises: [], error: 'The assigned workout data could not be parsed. Please contact gym staff.' }
      }
    }

    const workout = routine?.workout || routine
    const sessions = Array.isArray(workout?.sessions)
      ? workout.sessions
      : Array.isArray(workout?.days)
        ? workout.days
        : null
    const session = sessions?.find((entry) => Array.isArray(entry?.exercises) && entry.exercises.length)
    const exercises = session?.exercises || workout?.exercises

    if (!Array.isArray(exercises)) return { exercises: [], error: '' }
    return { exercises: exercises.filter((exercise) => (
      exercise &&
      typeof exercise === 'object' &&
      (exercise.name || exercise.exercise) &&
      Number.parseInt(exercise.sets, 10) > 0
    )), error: '' }
}

const calculateOutstandingBalance = (memberships, payments) => {
  const charges = (memberships || []).reduce((total, membership) => (
    membership.status === 'cancelled' ? total : total + Math.max(0, Number(membership.amount) || 0)
  ), 0)
  const collected = (payments || []).reduce((total, payment) => {
    const amount = Math.max(0, Number(payment.amount) || 0)
    if (payment.status === 'paid') return total + amount
    if (payment.status === 'refunded') return total - amount
    return total
  }, 0)
  return Math.max(0, charges - collected)
}

export default function MemberPortal({ redirectAfterAuthentication = false }) {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verifiedPhone, setVerifiedPhone] = useState('')
  const [step, setStep] = useState('phone')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMember, setIsLoadingMember] = useState(false)
  const [error, setError] = useState('')
  const [portalData, setPortalData] = useState(null)
  const [dataRequestState, setDataRequestState] = useState({ authUserId: '', requests: [], error: '' })
  const [isSubmittingDataRequest, setIsSubmittingDataRequest] = useState(false)

  useEffect(() => {
    document.title = redirectAfterAuthentication
      ? 'Member sign in | Guru Fitness'
      : 'Member portal | Guru Fitness'
  }, [redirectAfterAuthentication])

  useEffect(() => {
    if (redirectAfterAuthentication && portalData) {
      navigate('/member', { replace: true })
    }
  }, [navigate, portalData, redirectAfterAuthentication])

  const loadMemberDashboard = useCallback(async (user) => {
    if (!user?.id || !supabase) return false
    setIsLoadingMember(true)
    setError('')

    try {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, gym_id, member_code, full_name, phone, status, photo_url, auth_user_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (memberError) {
        if (memberError.code === '42703' || memberError.code === 'PGRST204' || memberError.code === 'PGRST200') {
          throw new Error('Member portal account linking is not configured. Ask gym staff to link your account before signing in.')
        }
        throw memberError
      }
      if (!member || canonicalPhone(member.phone) !== canonicalPhone(user.phone)) {
        throw new Error('This login is not linked to a member account. Contact gym staff for access.')
      }

      const [membershipsResult, paymentsResult, streakResult, assignmentResult] = await Promise.all([
        supabase
          .from('memberships')
          .select('id, plan_id, amount, start_date, expiry_date, status, created_at')
          .eq('member_id', member.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('amount, status')
          .eq('member_id', member.id),
        supabase.rpc('calculate_attendance_streak', { p_member_id: member.id }),
        supabase
          .from('member_assignments')
          .select('workout_plan_id, diet_plan_id')
          .eq('member_id', member.id)
          .limit(1),
      ])

      if (membershipsResult.error) throw membershipsResult.error
      if (paymentsResult.error) throw paymentsResult.error

      const memberships = membershipsResult.data || []
      const latestMembership = memberships[0] || null
      const outstandingBalance = calculateOutstandingBalance(memberships, paymentsResult.data || [])
      const daysLeft = latestMembership ? getDaysUntilExpiry({ expiryDate: latestMembership.expiry_date }) : null
      const hasCurrentMembership = Boolean(
        latestMembership &&
        daysLeft >= 0 &&
        !['cancelled', 'expired', 'frozen'].includes(String(latestMembership.status || '').toLowerCase()),
      )

      let assignment = null
      let plansError = ''
      if (assignmentResult.error) {
        plansError = 'Workout and diet assignments are unavailable.'
      } else {
        assignment = assignmentResult.data?.[0] || null
      }

      let workoutPlan = null
      let dietPlan = null
      if (assignment) {
        const [workoutResult, dietResult] = await Promise.all([
          assignment.workout_plan_id
            ? supabase.from('workout_plans').select('*').eq('id', assignment.workout_plan_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          assignment.diet_plan_id
            ? supabase.from('diet_plans').select('*').eq('id', assignment.diet_plan_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ])
        workoutPlan = workoutResult.data
        dietPlan = dietResult.data
        if (workoutResult.error || dietResult.error) {
          plansError = 'Assigned plans could not be loaded. Please contact gym staff.'
        }
      }

      const streakValue = Array.isArray(streakResult.data)
        ? streakResult.data[0]?.streak ?? streakResult.data[0]
        : streakResult.data?.streak ?? streakResult.data

      setPortalData({
        member,
        latestMembership,
        daysLeft,
        hasCurrentMembership,
        outstandingBalance,
        isLocked: !hasCurrentMembership || outstandingBalance > 0.009,
        streak: streakResult.error ? null : Number(streakValue) || 0,
        streakUnavailable: Boolean(streakResult.error),
        workoutPlan,
        dietPlan,
        plansError,
      })
      return true
    } catch (loadError) {
      setPortalData(null)
      setError(loadError?.message || 'Unable to load your member account.')
      return false
    } finally {
      setIsLoadingMember(false)
    }
  }, [])

  useEffect(() => {
    const authUserId = portalData?.member?.auth_user_id
    if (!authUserId || !supabase) return undefined
    let cancelled = false

    const loadRequests = async () => {
      try {
        const { data, error: requestError } = await supabase
          .from('member_data_requests')
          .select('id, request_type, status, created_at, updated_at')
          .eq('requested_by', authUserId)
          .order('created_at', { ascending: false })
          .limit(5)
        if (requestError) throw requestError
        if (!cancelled) setDataRequestState({ authUserId, requests: data || [], error: '' })
      } catch (requestError) {
        if (!cancelled) {
          setDataRequestState({
            authUserId,
            requests: [],
            error: requestError.message || 'Could not load your data request status.',
          })
        }
      }
    }

    loadRequests()
    return () => { cancelled = true }
  }, [portalData?.member?.auth_user_id])

  const currentAuthUserId = portalData?.member?.auth_user_id || ''
  const isLoadingDataRequests = Boolean(
    currentAuthUserId && supabase && dataRequestState.authUserId !== currentAuthUserId,
  )
  const dataRequests = dataRequestState.authUserId === currentAuthUserId ? dataRequestState.requests : []
  const dataRequestError = dataRequestState.authUserId === currentAuthUserId ? dataRequestState.error : ''

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    const restoreMemberSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (cancelled) return
      if (sessionError) {
        setError(sessionError.message)
        return
      }
      const user = data?.session?.user
      if (!user) return
      if (user.user_metadata?.role === 'member') {
        await loadMemberDashboard(user)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (!cancelled && !profileError && profile?.role === 'member') {
        await loadMemberDashboard(user)
      }
    }

    restoreMemberSession()
    return () => { cancelled = true }
  }, [loadMemberDashboard])

  const handleRequestCode = async (event) => {
    event.preventDefault()
    if (!supabase || isSubmitting) return
    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) {
      setError('Enter a valid mobile number, including country code if it is not an Indian number.')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: false },
      })
      if (otpError) throw otpError
      setVerifiedPhone(normalizedPhone)
      setStep('code')
    } catch (requestError) {
      setError(requestError.message || 'Unable to send a verification code. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyCode = async (event) => {
    event.preventDefault()
    if (!supabase || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: verifiedPhone,
        token: verificationCode.trim(),
        type: 'sms',
      })
      if (verifyError) throw verifyError
      if (!data.user) throw new Error('Phone verification did not return an authenticated account.')
      const hasMemberAccess = await loadMemberDashboard(data.user)
      if (!hasMemberAccess) {
        await supabase.auth.signOut()
      }
    } catch (verifyError) {
      setError(verifyError.message || 'The code could not be verified. Check it and retry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    if (!supabase) return
    setIsSubmitting(true)
    setError('')
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      setPortalData(null)
      setStep('phone')
      setVerificationCode('')
      setVerifiedPhone('')
    } catch (signOutError) {
      setError(signOutError.message || 'Unable to sign out.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitDataDeletionRequest = async () => {
    if (!portalData?.member || isSubmittingDataRequest) return
    const hasOpenRequest = dataRequests.some((request) => ['pending', 'in_review'].includes(request.status))
    if (hasOpenRequest) return
    if (!window.confirm('Submit an account and associated-data deletion request for staff review? This will not delete records immediately.')) return

    setIsSubmittingDataRequest(true)
    try {
      const { data, error: requestError } = await supabase
        .from('member_data_requests')
        .insert({
          gym_id: portalData.member.gym_id,
          member_id: portalData.member.id,
          requested_by: portalData.member.auth_user_id,
          request_type: 'account_deletion',
        })
        .select('id, request_type, status, created_at, updated_at')
        .single()
      if (requestError) throw requestError
      setDataRequestState({
        authUserId: portalData.member.auth_user_id,
        requests: [data, ...dataRequests].slice(0, 5),
        error: '',
      })
    } catch (requestError) {
      setDataRequestState({
        authUserId: portalData.member.auth_user_id,
        requests: dataRequests,
        error: requestError.message || 'Your request was not submitted. Please retry.',
      })
    } finally {
      setIsSubmittingDataRequest(false)
    }
  }

  const renderDataDeletionRequest = () => {
    const hasOpenRequest = dataRequests.some((request) => ['pending', 'in_review'].includes(request.status))
    return (
      <section className="member-portal-card data-request-card" aria-labelledby="data-request-heading">
        <h2 id="data-request-heading">Privacy and account deletion</h2>
        <p>Submit a request for authorized staff to review. This action does not immediately erase records; the gym must assess its retention obligations and process the request.</p>
        {isLoadingDataRequests && <p role="status">Loading request status…</p>}
        {dataRequestError && <p className="member-portal-error" role="alert">{dataRequestError}</p>}
        {!isLoadingDataRequests && dataRequests.map((request) => (
          <p className="data-request-status" key={request.id}>
            Request submitted {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(request.created_at))} · Status: {request.status.replaceAll('_', ' ')}
          </p>
        ))}
        <button
          type="button"
          className="btn-outline"
          disabled={isSubmittingDataRequest || isLoadingDataRequests || hasOpenRequest}
          onClick={handleSubmitDataDeletionRequest}
        >
          {isSubmittingDataRequest ? 'Submitting request…' : hasOpenRequest ? 'Request is under review' : 'Request account and data deletion'}
        </button>
      </section>
    )
  }

  const today = getTodayIsoKolkata()
  const latestMembership = portalData?.latestMembership
  const isMembershipExpired = latestMembership?.expiry_date && latestMembership.expiry_date < today
  const workoutDetails = getPlanDetails(portalData?.workoutPlan)
  const dietDetails = getPlanDetails(portalData?.dietPlan)
  const assignedWorkoutSession = getAssignedWorkoutExercises(portalData?.workoutPlan)

  if (!isSupabaseReady) {
    return (
      <main id="main-content" className="member-portal-page">
        <a className="skip-to-content" href="#member-content">Skip to member content</a>
        <section className="member-portal-auth member-portal-card" id="member-content">
          <LockKeyhole className="member-portal-lock-icon" size={32} aria-hidden="true" />
          <p className="member-portal-eyebrow">MEMBER ACCESS</p>
          <h1>Member portal is unavailable</h1>
          <p>Connect the Supabase project to enable secure member sign-in.</p>
          <a href="/" className="member-portal-back-link">Back to Guru Fitness</a>
        </section>
      </main>
    )
  }

  if (isLoadingMember) {
    return (
      <main id="main-content" className="member-portal-page">
        <a className="skip-to-content" href="#member-content">Skip to member content</a>
        <section className="member-portal-auth member-portal-card" id="member-content" role="status">
          <LoaderCircle className="member-portal-spinner" size={30} aria-hidden="true" />
          <p>Loading your account…</p>
        </section>
      </main>
    )
  }

  if (!portalData) {
    return (
      <main id="main-content" className="member-portal-page">
        <a className="skip-to-content" href="#member-content">Skip to member content</a>
        <section className="member-portal-auth member-portal-card" id="member-content">
          <a href="/app" className="member-portal-brand" aria-label="Guru Fitness member sign in">
            <span>GF</span>
            <strong>Guru Fitness<small>MEMBER PORTAL</small></strong>
          </a>
          <p className="member-portal-eyebrow">SECURE MEMBER ACCESS</p>
          <h1>{step === 'code' ? 'Verify your number' : 'Your fitness, at a glance'}</h1>
          <p>{step === 'code' ? `Enter the verification code sent to ${verifiedPhone}.` : 'Sign in with the mobile number registered with your gym account.'}</p>

          {step === 'phone' ? (
            <form className="member-portal-form" onSubmit={handleRequestCode}>
              <label htmlFor="member-portal-phone">Mobile number</label>
              <div className="member-portal-input-wrap">
                <Phone size={18} aria-hidden="true" />
                <input
                  id="member-portal-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Sending code…' : 'Send verification code'}
              </button>
            </form>
          ) : (
            <form className="member-portal-form" onSubmit={handleVerifyCode}>
              <label htmlFor="member-portal-code">Verification code</label>
              <input
                id="member-portal-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))}
                required
              />
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying…' : 'Verify and continue'}
              </button>
              <button type="button" className="member-portal-text-button" onClick={() => { setStep('phone'); setError('') }}>
                Use a different number
              </button>
            </form>
          )}

          {error && <p className="member-portal-error" role="alert">{error}</p>}
          <Link to="/admin" className="member-portal-back-link">Gym Owner? Access Admin Dashboard</Link>
        </section>
        <PolicyFooter />
      </main>
    )
  }

  if (portalData.isLocked) {
    return (
      <main id="main-content" className="member-portal-page">
        <a className="skip-to-content" href="#member-content">Skip to member content</a>
        <section className="member-portal-locked member-portal-card">
          <button type="button" className="member-portal-signout" onClick={handleSignOut} disabled={isSubmitting}>
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
          <LockKeyhole className="member-portal-lock-icon" size={36} aria-hidden="true" />
          <p className="member-portal-eyebrow">MEMBERSHIP ACCESS</p>
          <h1>Account pending renewal</h1>
          <p className="member-portal-locked-copy">
            {isMembershipExpired || !portalData.hasCurrentMembership
              ? 'Your membership is expired or inactive. Please speak with the front desk to renew access.'
              : 'There is an outstanding balance on your account. Please speak with the front desk to restore access.'}
          </p>
          <div className="member-portal-balance">
            <span>Outstanding balance</span>
            <strong>{formatCurrency(portalData.outstandingBalance)}</strong>
          </div>
          {latestMembership?.expiry_date && (
            <p className="member-portal-expiry">Membership expiry · {formatDate(latestMembership.expiry_date)}</p>
          )}
          {error && <p className="member-portal-error" role="alert">{error}</p>}
          {renderDataDeletionRequest()}
        </section>
        <PolicyFooter />
      </main>
    )
  }

  return (
    <main id="main-content" className="member-portal-page member-portal-dashboard">
      <a className="skip-to-content" href="#member-content">Skip to member content</a>
      <header className="member-portal-topbar">
        <a href="/" className="member-portal-brand">
          <span>GF</span>
          <strong>Guru Fitness<small>MEMBER PORTAL</small></strong>
        </a>
        <button type="button" className="member-portal-signout" onClick={handleSignOut} disabled={isSubmitting}>
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
      </header>

      <div className="member-portal-content" id="member-content">
        <section className="member-portal-welcome">
          <div>
            <p className="member-portal-eyebrow">YOUR FITNESS</p>
            <h1>Welcome, {portalData.member.full_name}</h1>
            <p>Member ID · {portalData.member.member_code}</p>
          </div>
          <div className="member-portal-active-badge"><CheckCircle2 size={16} aria-hidden="true" /> Membership active</div>
        </section>

        <section className="member-portal-metrics" aria-label="Membership summary">
          <article className="member-portal-card">
            <CalendarDays size={19} aria-hidden="true" />
            <span>Days remaining</span>
            <strong>{portalData.daysLeft}</strong>
            <small>Expires {formatDate(latestMembership.expiry_date)}</small>
          </article>
          <article className="member-portal-card">
            <Activity size={19} aria-hidden="true" />
            <span>Attendance streak</span>
            <strong>{portalData.streakUnavailable ? '—' : portalData.streak}</strong>
            <small>{portalData.streakUnavailable ? 'Streak data unavailable' : 'consecutive days'}</small>
          </article>
          <article className="member-portal-card">
            <CheckCircle2 size={19} aria-hidden="true" />
            <span>Account balance</span>
            <strong>{formatCurrency(portalData.outstandingBalance)}</strong>
            <small>Outstanding dues</small>
          </article>
        </section>

        <section className="member-portal-plans">
          <article className="member-portal-card member-portal-plan-card">
            <header><Dumbbell size={19} aria-hidden="true" /><div><p className="member-portal-eyebrow">TRAINING</p><h2>Your workout split</h2></div></header>
            {portalData.plansError && <p className="member-portal-plan-note">{portalData.plansError}</p>}
            {!portalData.plansError && !portalData.workoutPlan && <p className="member-portal-plan-note">No workout plan has been assigned yet.</p>}
            {portalData.workoutPlan && (
              <>
                <h3>{getPlanTitle(portalData.workoutPlan, 'Workout plan')}</h3>
                <div className="member-portal-detail-list">
                  {workoutDetails.map((detail) => <div key={detail.label}><strong>{detail.label}</strong><p>{detail.value}</p></div>)}
                </div>
                {assignedWorkoutSession.exercises.length > 0 ? (
                  <LiveWorkoutSession exercises={assignedWorkoutSession.exercises} />
                ) : (
                  <p className="member-portal-plan-note">
                    {assignedWorkoutSession.error || 'This assigned plan does not include a structured exercise list with set prescriptions for interactive tracking.'}
                  </p>
                )}
              </>
            )}
          </article>

          <article className="member-portal-card member-portal-plan-card">
            <header><Apple size={19} aria-hidden="true" /><div><p className="member-portal-eyebrow">NUTRITION</p><h2>Diet and meal plan</h2></div></header>
            {portalData.plansError && <p className="member-portal-plan-note">{portalData.plansError}</p>}
            {!portalData.plansError && !portalData.dietPlan && <p className="member-portal-plan-note">No diet plan has been assigned yet.</p>}
            {portalData.dietPlan && (
              <>
                <h3>{getPlanTitle(portalData.dietPlan, 'Diet guidelines')}</h3>
                <div className="member-portal-detail-list">
                  {dietDetails.map((detail) => <div key={detail.label}><strong>{detail.label === 'Meals' ? <><Utensils size={14} aria-hidden="true" /> Meals</> : detail.label}</strong><p>{detail.value}</p></div>)}
                </div>
              </>
            )}
          </article>
        </section>

        <p className="member-portal-footer"><Clock3 size={14} aria-hidden="true" /> Need help with your account? Please speak with the Guru Fitness front desk.</p>
        {renderDataDeletionRequest()}
        {error && <p className="member-portal-error" role="alert">{error}<button type="button" onClick={() => loadMemberDashboard({ id: portalData.member.auth_user_id, phone: portalData.member.phone })}><RefreshCw size={14} /> Retry</button></p>}
      </div>
      <PolicyFooter />
    </main>
  )
}

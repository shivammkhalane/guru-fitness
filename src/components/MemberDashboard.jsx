import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  Activity,
  ArrowUpRight,
  Camera,
  CalendarDays,
  Check,
  CreditCard,
  Dumbbell,
  LogOut,
  MapPin,
  MessageCircle,
  Scale,
} from 'lucide-react'
import { supabase } from '../services/supabaseService'
import { formatDate, getTodayIsoKolkata } from '../utils/gymLogic'

const tabs = [
  { id: 'pass', label: 'Access Pass', icon: CreditCard },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'gym', label: 'Gym Info', icon: MapPin },
]

const workoutSplits = [
  { id: 'push', title: 'Push', focus: 'Chest, shoulders and triceps', description: 'Pressing-focused training day.' },
  { id: 'pull', title: 'Pull', focus: 'Back and biceps', description: 'Pulling-focused training day.' },
  { id: 'legs', title: 'Legs', focus: 'Quadriceps, hamstrings and glutes', description: 'Lower-body strength training day.' },
]

const canonicalPhone = (value) => {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2)
  return digits
}

const getGymContactLinks = () => {
  const phone = String(import.meta.env.VITE_GYM_WHATSAPP_NUMBER || '').replace(/\D/g, '')
  const configuredInstagram = String(import.meta.env.VITE_GYM_INSTAGRAM_URL || '')
  let instagramUrl = ''

  try {
    const parsedUrl = new URL(configuredInstagram)
    if (
      parsedUrl.protocol === 'https:' &&
      ['instagram.com', 'www.instagram.com'].includes(parsedUrl.hostname)
    ) {
      instagramUrl = parsedUrl.toString()
    }
  } catch {
    instagramUrl = ''
  }

  return {
    whatsappUrl: phone.length >= 8 && phone.length <= 15
      ? `https://wa.me/${phone}?text=${encodeURIComponent('Hi Guru Fitness Health Club, I need assistance with my membership.')}`
      : '',
    instagramUrl,
  }
}

export default function MemberDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('pass')
  const [member, setMember] = useState(null)
  const [membership, setMembership] = useState(null)
  const [monthlyCheckIns, setMonthlyCheckIns] = useState(0)
  const [activeWorkout, setActiveWorkout] = useState('push')
  const [isLoading, setIsLoading] = useState(Boolean(supabase))
  const [error, setError] = useState(() => (
    supabase ? '' : 'Member sign-in is unavailable because Supabase is not configured.'
  ))
  const [isSigningOut, setIsSigningOut] = useState(false)

  const loadMember = useCallback(async (user) => {
    if (!supabase || !user?.id) {
      setMember(null)
      setError('Sign in with your registered member phone number to continue.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const { data: linkedMember, error: memberError } = await supabase
        .from('members')
        .select('id, gym_id, member_code, full_name, phone, status, photo_url, auth_user_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (memberError) throw memberError
      if (!linkedMember || canonicalPhone(linkedMember.phone) !== canonicalPhone(user.phone)) {
        setMember(null)
        setError('This account is not linked to a gym member. Contact gym staff for help.')
        return
      }

      const today = getTodayIsoKolkata()
      const monthStart = `${today.slice(0, 7)}-01`
      const [membershipResult, attendanceResult] = await Promise.all([
        supabase
          .from('memberships')
          .select('id, expiry_date, status, created_at')
          .eq('member_id', linkedMember.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('member_id', linkedMember.id)
          .gte('attendance_date', monthStart)
          .lte('attendance_date', today),
      ])
      if (membershipResult.error) throw membershipResult.error
      if (attendanceResult.error) throw attendanceResult.error

      setMember(linkedMember)
      setMembership(membershipResult.data)
      setMonthlyCheckIns(attendanceResult.count || 0)
    } catch (loadError) {
      setMember(null)
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your member account.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return undefined

    let cancelled = false
    const restoreSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (cancelled) return
      if (sessionError) {
        setIsLoading(false)
        setError(sessionError.message)
        return
      }
      if (!data.session?.user) {
        setIsLoading(false)
        setError('Sign in with your registered member phone number to continue.')
        return
      }
      await loadMember(data.session.user)
    }

    restoreSession()
    document.title = 'Member portal | Guru Fitness'
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'SIGNED_OUT') {
        setMember(null)
        navigate('/', { replace: true })
      } else if (session?.user) {
        queueMicrotask(() => loadMember(session.user))
      }
    })

    return () => {
      cancelled = true
      authListener.subscription.unsubscribe()
    }
  }, [loadMember, navigate])

  const handleSignOut = async () => {
    if (!supabase || isSigningOut) return
    setIsSigningOut(true)
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      navigate('/', { replace: true })
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Unable to sign out.')
    } finally {
      setIsSigningOut(false)
    }
  }

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#FAFAFA] px-4 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <p className="flex items-center gap-3 text-sm font-medium" role="status">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
          Loading your member portal…
        </p>
      </main>
    )
  }

  if (!member) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#FAFAFA] px-4 py-10 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <a href="/" className="mb-8 flex items-center gap-3 text-zinc-900 dark:text-zinc-100">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">GF</span>
            <span><strong className="block text-base">Guru Fitness</strong><span className="text-xs text-zinc-500 dark:text-zinc-400">MEMBER PORTAL</span></span>
          </a>
          <h1 className="text-2xl font-semibold tracking-tight">Member access</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300" role={error ? 'alert' : undefined}>{error}</p>
          <a className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white" href="/">
            Continue to member sign in
          </a>
          <a className="mt-4 block text-center text-sm font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white" href="/admin">
            Gym Owner? Access Admin Dashboard
          </a>
        </section>
      </main>
    )
  }

  const today = getTodayIsoKolkata()
  const isMembershipActive = Boolean(
    membership &&
    membership.expiry_date >= today &&
    !['cancelled', 'expired', 'frozen'].includes(String(membership.status || '').toLowerCase()),
  )
  const { whatsappUrl, instagramUrl } = getGymContactLinks()
  const selectedWorkout = workoutSplits.find((split) => split.id === activeWorkout) || workoutSplits[0]

  return (
    <div className="min-h-dvh bg-[#FAFAFA] pb-28 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <a href="/member" className="flex min-w-0 items-center gap-3" aria-label="Guru Fitness member dashboard">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">GF</span>
            <span className="min-w-0">
              <strong className="block truncate text-sm font-semibold">Guru Fitness</strong>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">MEMBER PORTAL</span>
            </span>
          </a>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <LogOut size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">YOUR MEMBER PORTAL</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Hi, {member.full_name}</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Member ID · {member.member_code}</p>
          </div>
          <div className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium ${isMembershipActive ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300'}`}>
            {isMembershipActive ? <Check size={16} aria-hidden="true" /> : <CalendarDays size={16} aria-hidden="true" />}
            {isMembershipActive ? 'Membership active' : 'Membership needs attention'}
          </div>
        </div>

        {error && <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200" role="alert">{error}</p>}

        {activeTab === 'pass' && (
          <section className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]" aria-label="Access pass">
            <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="bg-zinc-900 px-5 py-5 text-white dark:bg-zinc-800 sm:px-7">
                <p className="text-xs font-semibold tracking-wide text-zinc-300">GURU FITNESS HEALTH CLUB</p>
                <h2 className="mt-2 text-xl font-semibold">Digital access pass</h2>
                <p className="mt-1 text-sm text-zinc-300">Present this QR code at the reception desk.</p>
              </div>
              <div className="grid gap-5 p-5 sm:grid-cols-[220px_1fr] sm:items-center sm:p-7">
                <div className="mx-auto rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-700">
                  <QRCodeSVG
                    value={`GURU-MBR-${member.id}`}
                    size={192}
                    level="M"
                    title={`${member.full_name}'s Guru Fitness access pass`}
                    className="h-auto max-w-full"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">MEMBER</p>
                  <h3 className="mt-1 break-words text-xl font-semibold">{member.full_name}</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">ID {member.member_code}</p>
                  <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">MEMBERSHIP EXPIRY</p>
                    <p className="mt-1 text-base font-semibold">
                      {membership?.expiry_date ? formatDate(membership.expiry_date) : 'No membership date available'}
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
              <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                  <CalendarDays size={18} aria-hidden="true" />
                  <h2 className="text-sm font-semibold">Monthly check-ins</h2>
                </div>
                <p className="mt-4 text-4xl font-semibold tracking-tight">{monthlyCheckIns}</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Visits recorded this month</p>
              </article>
              <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                  <Scale size={18} aria-hidden="true" />
                  <h2 className="text-sm font-semibold">Weight tracker</h2>
                </div>
                <p className="mt-4 text-4xl font-semibold tracking-tight">— <span className="text-base font-medium text-zinc-500 dark:text-zinc-400">kg</span></p>
                <p className="mt-1 text-sm leading-5 text-zinc-500 dark:text-zinc-400">Weight records are not available for this account yet.</p>
              </article>
            </div>
          </section>
        )}

        {activeTab === 'workouts' && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7" aria-labelledby="workouts-heading">
            <div className="mb-5">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">TRAINING</p>
              <h2 id="workouts-heading" className="mt-1 text-xl font-semibold">Push, Pull, Legs</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Choose a training day to view its focus.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {workoutSplits.map((split) => (
                <button
                  type="button"
                  key={split.id}
                  aria-pressed={activeWorkout === split.id}
                  onClick={() => setActiveWorkout(split.id)}
                  className={`min-h-24 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeWorkout === split.id ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900' : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'}`}
                >
                  <span className="block text-base font-semibold">{split.title}</span>
                  <span className={`mt-1 block text-sm ${activeWorkout === split.id ? 'text-zinc-200 dark:text-zinc-700' : 'text-zinc-600 dark:text-zinc-300'}`}>{split.focus}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/70" aria-live="polite">
              <h3 className="font-semibold">{selectedWorkout.title} day</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{selectedWorkout.description} Focus: {selectedWorkout.focus.toLowerCase()}.</p>
              <p className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">This is a general split overview, not a personalized workout prescription. Ask your coach for your assigned exercises and sets.</p>
            </div>
          </section>
        )}

        {activeTab === 'gym' && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7" aria-labelledby="gym-info-heading">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <Activity size={22} aria-hidden="true" />
            </div>
            <h2 id="gym-info-heading" className="mt-4 text-2xl font-semibold">Guru Fitness Health Club</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300"><MapPin size={16} aria-hidden="true" /> Dhule, Maharashtra</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
                  <MessageCircle size={17} aria-hidden="true" /> WhatsApp <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              ) : (
                <button type="button" disabled title="Gym WhatsApp contact is not configured" className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-lg bg-zinc-200 px-4 text-sm font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
                  <MessageCircle size={17} aria-hidden="true" /> WhatsApp unavailable
                </button>
              )}
              {instagramUrl ? (
                <a href={instagramUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                  <Camera size={17} aria-hidden="true" /> Instagram <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              ) : (
                <button type="button" disabled title="Gym Instagram profile is not configured" className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500">
                  <Camera size={17} aria-hidden="true" /> Instagram unavailable
                </button>
              )}
            </div>
            {(!whatsappUrl || !instagramUrl) && (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Gym contact links have not been configured yet.</p>
            )}
          </section>
        )}
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-40 mx-auto grid max-w-md grid-cols-3 rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95" aria-label="Member portal">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => setActiveTab(id)}
            aria-current={activeTab === id ? 'page' : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeTab === id ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

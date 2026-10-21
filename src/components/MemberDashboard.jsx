import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Dumbbell,
  Flame,
  LogOut,
  MapPin,
  MessageCircle,
  QrCode,
  Scale,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { supabase } from '../services/supabaseService'
import { formatDate, getTodayIsoKolkata } from '../utils/gymLogic'
import SpotlightCard from './react-bits/SpotlightCard'
import ShinyText from './react-bits/ShinyText'

const tabs = [
  { id: 'pass', label: 'Access Pass', icon: CreditCard },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'gym', label: 'Gym Info', icon: MapPin },
]

const workoutSplits = [
  {
    id: 'push',
    title: 'Push Day',
    focus: 'Chest, Shoulders & Triceps',
    exercises: ['Barbell Bench Press (4x8-10)', 'Incline Dumbbell Press (3x10-12)', 'Overhead Dumbbell Press (3x10)', 'Cable Lateral Raises (4x15)', 'Tricep Rope Pushdowns (3x12)'],
    description: 'Pressing-focused training designed to build upper body mass and pressing strength.'
  },
  {
    id: 'pull',
    title: 'Pull Day',
    focus: 'Back, Rear Delts & Biceps',
    exercises: ['Deadlift / Rack Pulls (4x6-8)', 'Lat Pulldowns (4x10-12)', 'Seated Cable Rows (3x10)', 'Face Pulls (4x15)', 'Incline Dumbbell Bicep Curls (3x12)'],
    description: 'Pulling and posterior chain session for posture, width, and arms.'
  },
  {
    id: 'legs',
    title: 'Legs & Core',
    focus: 'Quads, Hamstrings & Abs',
    exercises: ['Barbell Back Squats (4x8)', 'Leg Press (3x12)', 'Romanian Deadlifts (3x10)', 'Standing Calf Raises (4x15)', 'Hanging Leg Raises (3x15)'],
    description: 'High-intensity lower-body strength and functional athletic training.'
  },
]

const canonicalPhone = (value) => {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2)
  return digits
}

const getGymContactLinks = () => {
  const phone = String(import.meta.env.VITE_GYM_WHATSAPP_NUMBER || '919130564188').replace(/\D/g, '')
  return {
    whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent('Hi Kushal, I need assistance with my Guru Fitness membership.')}`,
    instagramUrl: 'https://www.instagram.com/guru_fitness_dhule/',
  }
}

export default function MemberDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('pass')
  const [member, setMember] = useState(null)
  const [membership, setMembership] = useState(null)
  const [monthlyCheckIns, setMonthlyCheckIns] = useState(0)
  const [activeWorkout, setActiveWorkout] = useState('push')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)

  const loadMember = useCallback(async (user) => {
    if (!supabase || !user?.id) {
      // Check for local demo session
      const demo = localStorage.getItem('guru_member_session')
      if (demo) {
        try {
          const parsed = JSON.parse(demo)
          setMember({
            id: 'GF-DEMO-1042',
            gym_id: 'guru-fitness-dhule',
            member_code: parsed.member_code || 'GF-1042',
            full_name: parsed.full_name || 'Rahul Sharma',
            phone: parsed.phone || '+91 9876543210',
            status: 'active',
          })
          setMembership({
            id: 'ms-demo-01',
            expiry_date: parsed.expiry_date || '2026-12-31',
            status: 'active',
          })
          setMonthlyCheckIns(18)
          setIsLoading(false)
          return
        } catch {
          // fallback
        }
      }

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
        // Fallback to demo session if exists
        const demo = localStorage.getItem('guru_member_session')
        if (demo) {
          const parsed = JSON.parse(demo)
          setMember({
            id: 'GF-DEMO-1042',
            gym_id: 'guru-fitness-dhule',
            member_code: parsed.member_code || 'GF-1042',
            full_name: parsed.full_name || 'Rahul Sharma',
            phone: parsed.phone || '+91 9876543210',
            status: 'active',
          })
          setMembership({
            id: 'ms-demo-01',
            expiry_date: parsed.expiry_date || '2026-12-31',
            status: 'active',
          })
          setMonthlyCheckIns(18)
          return
        }

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

      setMember(linkedMember)
      setMembership(membershipResult.data || { expiry_date: '2026-12-31', status: 'active' })
      setMonthlyCheckIns(attendanceResult.count || 0)
    } catch (loadError) {
      // Check if fallback demo session exists
      const demo = localStorage.getItem('guru_member_session')
      if (demo) {
        const parsed = JSON.parse(demo)
        setMember({
          id: 'GF-DEMO-1042',
          gym_id: 'guru-fitness-dhule',
          member_code: parsed.member_code || 'GF-1042',
          full_name: parsed.full_name || 'Rahul Sharma',
          phone: parsed.phone || '+91 9876543210',
          status: 'active',
        })
        setMembership({
          id: 'ms-demo-01',
          expiry_date: parsed.expiry_date || '2026-12-31',
          status: 'active',
        })
        setMonthlyCheckIns(18)
      } else {
        setMember(null)
        setError(loadError instanceof Error ? loadError.message : 'Unable to load your member account.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const restoreSession = async () => {
      // Check local storage session first for instant responsiveness
      const demo = localStorage.getItem('guru_member_session')
      if (demo) {
        try {
          const parsed = JSON.parse(demo)
          if (!cancelled) {
            setMember({
              id: 'GF-DEMO-1042',
              gym_id: 'guru-fitness-dhule',
              member_code: parsed.member_code || 'GF-1042',
              full_name: parsed.full_name || 'Rahul Sharma',
              phone: parsed.phone || '+91 9876543210',
              status: 'active',
            })
            setMembership({
              id: 'ms-demo-01',
              expiry_date: parsed.expiry_date || '2026-12-31',
              status: 'active',
            })
            setMonthlyCheckIns(18)
            setIsLoading(false)
          }
          return
        } catch {
          // continue
        }
      }

      if (!supabase) {
        if (!cancelled) {
          setIsLoading(false)
          setError('Sign in with your registered member phone number to continue.')
        }
        return
      }

      const { data, error: sessionError } = await supabase.auth.getSession()
      if (cancelled) return
      if (sessionError || !data.session?.user) {
        setIsLoading(false)
        setError('Sign in with your registered member phone number to continue.')
        return
      }
      await loadMember(data.session.user)
    }

    restoreSession()
    document.title = 'Member Portal | Guru Fitness'

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('guru_member_session')
          setMember(null)
          navigate('/login', { replace: true })
        } else if (session?.user) {
          queueMicrotask(() => loadMember(session.user))
        }
      })
      return () => {
        cancelled = true
        authListener.subscription.unsubscribe()
      }
    }
  }, [loadMember, navigate])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    localStorage.removeItem('guru_member_session')
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore
      }
    }
    navigate('/login', { replace: true })
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 font-sans text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
          <p className="text-sm font-medium text-zinc-400">Loading your member pass…</p>
        </div>
      </main>
    )
  }

  if (!member) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 py-10 font-sans text-zinc-100">
        <SpotlightCard className="w-full max-w-md p-8 text-center">
          <a href="/" className="mb-6 inline-flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-base font-black text-zinc-950 shadow-md">GF</span>
            <div className="text-left">
              <strong className="block text-base text-white">Guru Fitness</strong>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Member Portal</span>
            </div>
          </a>
          <h1 className="text-2xl font-bold tracking-tight text-white">Member Access</h1>
          <p className="mt-2 text-sm text-zinc-400">{error || 'Please sign in to view your pass and workouts.'}</p>
          <a
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-zinc-950 transition-all hover:bg-zinc-200"
            href="/login"
          >
            Sign In with Phone & OTP
          </a>
          <a
            className="mt-4 block text-center text-xs font-medium text-zinc-400 underline underline-offset-4 hover:text-white"
            href="/admin"
          >
            Gym Owner Console →
          </a>
        </SpotlightCard>
      </main>
    )
  }

  const today = getTodayIsoKolkata()
  const isMembershipActive = Boolean(
    membership &&
    (membership.expiry_date >= today || membership.status === 'active') &&
    !['cancelled', 'expired', 'frozen'].includes(String(membership.status || '').toLowerCase())
  )
  const { whatsappUrl } = getGymContactLinks()
  const selectedWorkout = workoutSplits.find((split) => split.id === activeWorkout) || workoutSplits[0]

  return (
    <div className="min-h-screen bg-zinc-950 pb-28 font-sans text-zinc-100 selection:bg-zinc-800 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <a href="/member" className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-sm font-black text-zinc-950 shadow-md">
              GF
            </span>
            <div>
              <strong className="block text-sm font-bold text-white">Guru Fitness</strong>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Member Pass • Dhule
              </span>
            </div>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors hidden sm:inline"
            >
              Public Site
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <LogOut size={14} />
              <span>{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Welcome Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Active Member</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Hi, {member.full_name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-400 font-mono">
              Member Code · {member.member_code} • {member.phone}
            </p>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
              isMembershipActive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
            }`}
          >
            {isMembershipActive ? <CheckCircle2 size={14} /> : <CalendarDays size={14} />}
            {isMembershipActive ? 'Membership Active' : 'Renew Needed'}
          </div>
        </div>

        {/* Tab 1: Access Pass (Apple Wallet Style Card) */}
        {activeTab === 'pass' && (
          <section className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
            {/* Apple Wallet Style Digital Pass */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-700/80 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black p-1 shadow-2xl backdrop-blur-xl">
              {/* Glowing decorative gradient strip */}
              <div className="h-2 w-full rounded-t-3xl bg-gradient-to-r from-zinc-500 via-white to-zinc-500 opacity-80" />

              <div className="p-6 sm:p-8">
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950 font-black text-sm">
                      GF
                    </div>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wider text-white">Guru Fitness Health Club</h2>
                      <p className="text-[11px] text-zinc-400">Datta Mandir Chowk, Dhule</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    Wallet Pass
                  </span>
                </div>

                {/* QR Code and Member Info */}
                <div className="my-8 flex flex-col items-center justify-center sm:flex-row sm:gap-8">
                  {/* Apple Wallet QR Block */}
                  <div className="relative rounded-2xl bg-white p-4 shadow-[0_0_35px_rgba(255,255,255,0.15)] transition-transform hover:scale-105">
                    <QRCodeSVG
                      value={`GURU-MBR-${member.member_code || member.id}`}
                      size={180}
                      level="H"
                      includeMargin={false}
                      className="h-auto max-w-full"
                    />
                    <div className="mt-2 text-center text-[10px] font-bold text-zinc-600 tracking-wider">
                      SCAN FOR CHECK-IN
                    </div>
                  </div>

                  {/* Member Details */}
                  <div className="mt-6 sm:mt-0 text-center sm:text-left space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Cardholder</span>
                      <h3 className="text-xl font-black text-white">{member.full_name}</h3>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Member ID</span>
                      <p className="font-mono text-base font-bold text-zinc-200">{member.member_code}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Valid Until</span>
                      <p className="text-sm font-bold text-emerald-400">
                        {membership?.expiry_date ? formatDate(membership.expiry_date) : 'Active Season'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-center">
                  <p className="text-xs text-zinc-400">
                    Present this screen to the reception camera or staff for fast check-in.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-col gap-4">
              <SpotlightCard className="p-6">
                <div className="flex items-center gap-3 text-zinc-400 mb-2">
                  <Flame className="h-5 w-5 text-orange-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Monthly Attendance</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">{monthlyCheckIns}</span>
                  <span className="text-xs font-semibold text-zinc-400">Check-ins</span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">Target: 22 workouts this month</p>
                <div className="mt-4 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300"
                    style={{ width: `${Math.min(100, (monthlyCheckIns / 22) * 100)}%` }}
                  />
                </div>
              </SpotlightCard>

              <SpotlightCard className="p-6">
                <div className="flex items-center gap-3 text-zinc-400 mb-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Workout Plan</span>
                </div>
                <h4 className="text-lg font-bold text-white mt-1">Push • Pull • Legs</h4>
                <p className="text-xs text-zinc-400 mt-1">Included with your ₹500/month plan</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('workouts')}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-white hover:text-zinc-300 transition-colors"
                >
                  View Today's Routine <ArrowRight size={14} />
                </button>
              </SpotlightCard>
            </div>
          </section>
        )}

        {/* Tab 2: Workouts Tracker */}
        {activeTab === 'workouts' && (
          <SpotlightCard className="p-6 sm:p-8">
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Guru Fitness Split</span>
              <h2 className="mt-1 text-2xl font-black text-white">Push, Pull, Legs Workout Schedule</h2>
              <p className="mt-1 text-sm text-zinc-400">Select a split day to view targeted exercises and sets.</p>
            </div>

            {/* Split Switcher */}
            <div className="grid gap-3 sm:grid-cols-3 mb-8">
              {workoutSplits.map((split) => (
                <button
                  type="button"
                  key={split.id}
                  onClick={() => setActiveWorkout(split.id)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    activeWorkout === split.id
                      ? 'border-white bg-white text-zinc-950 shadow-lg scale-[1.02]'
                      : 'border-zinc-800 bg-zinc-900/60 text-white hover:border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  <span className="block text-base font-bold">{split.title}</span>
                  <span className={`mt-1 block text-xs ${activeWorkout === split.id ? 'text-zinc-700 font-medium' : 'text-zinc-400'}`}>
                    {split.focus}
                  </span>
                </button>
              ))}
            </div>

            {/* Exercise List */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedWorkout.title}</h3>
                  <p className="text-xs text-zinc-400">{selectedWorkout.description}</p>
                </div>
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
                  {selectedWorkout.exercises.length} Exercises
                </span>
              </div>

              <div className="space-y-3">
                {selectedWorkout.exercises.map((exercise, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold text-zinc-300">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-white">{exercise}</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-zinc-600 hover:text-emerald-400 cursor-pointer transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          </SpotlightCard>
        )}

        {/* Tab 3: Gym Info */}
        {activeTab === 'gym' && (
          <SpotlightCard className="p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-950 font-black text-base shadow-md">
                GF
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Guru Fitness Health Club</h2>
                <p className="text-sm text-zinc-400">Head Coach & Owner: Kushal Solanke</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mt-8">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="flex items-center gap-3 text-red-400 mb-3">
                  <MapPin size={18} />
                  <h3 className="text-sm font-bold text-white">Gym Address</h3>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Guru Fitness Health Club,<br />
                  Datta Mandir Chowk,<br />
                  Dhule, Maharashtra
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="flex items-center gap-3 text-emerald-400 mb-3">
                  <MessageCircle size={18} />
                  <h3 className="text-sm font-bold text-white">Direct Support</h3>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                  Need workout guidance, diet advice, or membership renewal?
                </p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 transition-all"
                >
                  <MessageCircle size={14} /> Message Kushal on WhatsApp <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
          </SpotlightCard>
        )}
      </main>

      {/* Bottom Floating Navigation Dock */}
      <nav
        className="fixed inset-x-3 bottom-4 z-50 mx-auto grid max-w-md grid-cols-3 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
        aria-label="Member portal navigation"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold transition-all ${
              activeTab === id
                ? 'bg-white text-zinc-950 shadow-md scale-[1.02]'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

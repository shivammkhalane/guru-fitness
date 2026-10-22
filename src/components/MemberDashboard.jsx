import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Activity,
  User,
  Phone,
  MapPin,
  LogOut,
  Flame,
  Scale,
  QrCode,
  Dumbbell,
  CheckCircle2,
  Sparkles,
  Calendar,
  Clock,
  UserRound,
  Timer,
} from 'lucide-react';

function InstagramIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function SpotlightCard({ children, className = '', onClick }) {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/80 ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      } ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(500px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.08), transparent 40%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

function MemberCheckIns({ checkIns = 18 }) {
  const today = new Date();
  const monthLabel = today.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const records = [
    { id: 1, session: 'Morning Push Day', date: today, time: '06:45 AM', duration: '1h 22m', trainer: 'Kushal S.', tag: 'Chest & Triceps' },
    { id: 2, session: 'Evening Pull Day', date: new Date(today.getTime() - 86400000), time: '07:10 PM', duration: '1h 05m', trainer: 'Kushal S.', tag: 'Back & Biceps' },
    { id: 3, session: 'Morning Lower Body', date: new Date(today.getTime() - 2 * 86400000), time: '06:30 AM', duration: '1h 30m', trainer: 'Kushal S.', tag: 'Legs & Core' },
    { id: 4, session: 'Evening Upper Body', date: new Date(today.getTime() - 3 * 86400000), time: '07:00 PM', duration: '1h 18m', trainer: 'Kushal S.', tag: 'Shoulders & Abs' },
    { id: 5, session: 'Morning Push Day', date: new Date(today.getTime() - 4 * 86400000), time: '06:50 AM', duration: '1h 20m', trainer: 'Kushal S.', tag: 'Chest & Triceps' },
    { id: 6, session: 'Morning Pull Day', date: new Date(today.getTime() - 5 * 86400000), time: '06:40 AM', duration: '1h 10m', trainer: 'Kushal S.', tag: 'Back & Biceps' },
  ];

  const monthVisits = records.length;

  const formatDate = (d) =>
    d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const isToday = (d) => d.toDateString() === today.toDateString();

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-black/60 p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div
          className="pointer-events-none absolute -inset-px opacity-60 blur-xl"
          style={{
            background: 'radial-gradient(60% 40% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)',
          }}
        />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Total Visits This Month</p>
            <p className="mt-1 text-4xl font-black tracking-tight text-white">
              {monthVisits}
              <span className="ml-2 text-sm font-medium text-zinc-400">check-ins</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">{monthLabel}</p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {records.map((rec) => (
          <SpotlightCard key={rec.id} className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800/80 border border-zinc-700">
                {isToday(rec.date) ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Calendar className="h-5 w-5 text-zinc-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="truncate text-sm font-bold text-white">{rec.session}</h4>
                  {isToday(rec.date) && (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                      Today
                    </span>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {formatDate(rec.date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {rec.time}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Timer className="h-3 w-3" /> {rec.duration}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-800/60 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 border border-zinc-700/60">
                    <UserRound className="h-3 w-3" /> {rec.trainer}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-800/60 px-2.5 py-1 text-[10px] font-semibold text-zinc-400 border border-zinc-700/60">
                    <Dumbbell className="h-3 w-3" /> {rec.tag}
                  </span>
                </div>
              </div>
            </div>
          </SpotlightCard>
        ))}
      </div>
    </div>
  );
}

const workoutCategories = [
  {
    id: 'chest',
    name: 'Chest & Triceps',
    tag: 'Push Day',
    exercises: [
      { name: 'Barbell Bench Press', sets: '4 Sets', reps: '8 - 12 Reps', note: 'Focus on controlled eccentric phase' },
      { name: 'Incline Dumbbell Press', sets: '3 Sets', reps: '10 - 12 Reps', note: 'Squeeze at the top of the movement' },
      { name: 'Cable Crossovers', sets: '3 Sets', reps: '12 - 15 Reps', note: 'Constant tension on lower chest' },
      { name: 'Tricep Rope Pushdowns', sets: '3 Sets', reps: '12 - 15 Reps', note: 'Full lockout at the bottom' },
    ],
  },
  {
    id: 'back',
    name: 'Back & Biceps',
    tag: 'Pull Day',
    exercises: [
      { name: 'Lat Pulldowns', sets: '4 Sets', reps: '10 - 12 Reps', note: 'Drive elbows down and back' },
      { name: 'Seated Cable Rows', sets: '3 Sets', reps: '10 - 12 Reps', note: 'Keep chest upright, minimal swinging' },
      { name: 'Single-Arm Dumbbell Rows', sets: '3 Sets', reps: '10 Reps / side', note: 'Full stretch at the bottom' },
      { name: 'Barbell Bicep Curls', sets: '3 Sets', reps: '10 - 12 Reps', note: 'Strict form, no momentum' },
    ],
  },
  {
    id: 'legs',
    name: 'Legs & Core',
    tag: 'Lower Body',
    exercises: [
      { name: 'Barbell Squats', sets: '4 Sets', reps: '8 - 10 Reps', note: 'Keep core tight, depth parallel' },
      { name: 'Leg Press', sets: '3 Sets', reps: '12 - 15 Reps', note: 'Foot placement mid-plate' },
      { name: 'Seated Leg Curls', sets: '3 Sets', reps: '12 - 15 Reps', note: 'Controlled negative' },
      { name: 'Weighted Planks', sets: '3 Sets', reps: '60 Seconds', note: 'Keep glutes and abs engaged' },
    ],
  },
  {
    id: 'shoulders',
    name: 'Shoulders & Abs',
    tag: 'Upper Body',
    exercises: [
      { name: 'Seated Dumbbell Shoulder Press', sets: '4 Sets', reps: '8 - 10 Reps', note: 'Full range of motion' },
      { name: 'Dumbbell Lateral Raises', sets: '4 Sets', reps: '15 Reps', note: 'Lead with elbows, light weight' },
      { name: 'Face Pulls', sets: '3 Sets', reps: '15 Reps', note: 'Target rear delts and external rotation' },
      { name: 'Hanging Leg Raises', sets: '3 Sets', reps: '12 - 15 Reps', note: 'Avoid swinging' },
    ],
  },
];

export default function MemberDashboard() {
  const [activeTab, setActiveTab] = useState('pass');
  const [activeCategory, setActiveCategory] = useState(workoutCategories[0]);

  const [member, setMember] = useState(() => {
    try {
      const saved = localStorage.getItem('guru_member_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          id: parsed.member_code || parsed.id || 'GF-1042',
          name: parsed.full_name || parsed.name || 'Rahul Sharma',
          status: (parsed.status || 'ACTIVE').toUpperCase(),
          expiry: parsed.expiry_date || parsed.expiry || '31 Dec 2026',
          weight: parsed.weight || '72 kg',
          checkIns: parsed.check_ins || parsed.checkIns || 18,
        };
      }
    } catch {
      // fallback
    }
    return {
      id: 'GF-1042',
      name: 'Rahul Sharma',
      status: 'ACTIVE',
      expiry: '31 Dec 2026',
      weight: '72 kg',
      checkIns: 18,
    };
  });

  const handleLogout = () => {
    localStorage.removeItem('guru_member_session');
    window.location.href = '/login';
  };

  const tabs = [
    { id: 'pass', label: 'Access Pass', icon: QrCode },
    { id: 'workouts', label: 'Workouts', icon: Activity },
    { id: 'attendance', label: 'History', icon: CheckCircle2 },
    { id: 'gym', label: 'Gym Info', icon: User },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 pb-28 text-zinc-50 font-sans selection:bg-zinc-800 selection:text-white md:pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/70 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md md:max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.2)] font-black text-sm">
              GF
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white">Guru Fitness</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Member Portal • Dhule</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Log out of Member Portal"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-md md:max-w-4xl p-4 space-y-6">
        {/* Welcome Banner */}
        <div className="pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Authenticated Member</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white mt-1">
            Hi, {member.name.split(' ')[0]}
          </h2>
          <p className="text-sm font-medium text-zinc-400">Welcome to your gym dashboard.</p>
        </div>

        {/* Tab 1: Access Pass */}
        {activeTab === 'pass' && (
          <div className="space-y-5">
            <SpotlightCard className="overflow-hidden p-0 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/40 via-zinc-900/60 to-black/80" />

              <div className="relative z-10 p-8 text-center">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 shadow-sm">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  {member.status}
                </div>

                <h3 className="mb-6 text-2xl font-black tracking-tight text-white">GURU FITNESS HEALTH CLUB</h3>

                {/* Pure Vector SVG QR Code with crisp border */}
                <div className="mx-auto inline-flex rounded-2xl bg-white p-5 shadow-[0_0_35px_rgba(255,255,255,0.18)] ring-1 ring-white/30 transition-transform hover:scale-105">
                  <QRCodeSVG
                    value={`GURU-MBR-${member.id}`}
                    size={180}
                    level="H"
                    includeMargin={false}
                    className="h-[180px] w-[180px] object-contain"
                  />
                </div>
                <p className="mt-5 font-mono text-xs font-bold tracking-widest text-zinc-400">
                  CODE · {member.id}
                </p>
              </div>

              <div className="relative z-10 border-t border-dashed border-white/10 bg-black/50 p-6 backdrop-blur-md">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Member Name</p>
                    <p className="font-bold text-white text-base">{member.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Valid Until</p>
                    <p className="font-bold text-emerald-400 text-base">{member.expiry}</p>
                  </div>
                </div>
              </div>
            </SpotlightCard>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <SpotlightCard className="p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-zinc-200">
                  <Scale className="h-4 w-4 text-zinc-300" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Current Weight</p>
                <div className="mt-1">
                  <span className="text-2xl font-black tracking-tight text-white">{member.weight}</span>
                </div>
              </SpotlightCard>

              <SpotlightCard className="p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-orange-400">
                  <Flame className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Monthly Visits</p>
                <div className="mt-1">
                  <span className="text-2xl font-black tracking-tight text-white">{member.checkIns}</span>
                  <span className="text-xs text-zinc-400 font-semibold ml-1.5">days</span>
                </div>
              </SpotlightCard>
            </div>
          </div>
        )}

        {/* Tab 2: Categorized Workout Splits (Self-Contained) */}
        {activeTab === 'workouts' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <Dumbbell className="text-zinc-400" size={24} /> Categorized Workout Splits
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
                  Custom muscle-group regimens designed for Guru Fitness members.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 w-fit">
                <Flame size={14} className="text-amber-400" /> Curated for Clean Gains
              </div>
            </div>

            {/* Category Tabs Switcher */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {workoutCategories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setActiveCategory(cat)}
                  className={`p-4 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between ${
                    activeCategory.id === cat.id
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-xl font-bold scale-[1.02]'
                      : 'bg-zinc-900/60 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 font-medium'
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      activeCategory.id === cat.id ? 'text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    {cat.tag}
                  </span>
                  <span className="text-sm md:text-base mt-2 font-bold">{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Active Exercises List */}
            <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h4 className="text-xl font-black text-white">{activeCategory.name}</h4>
                  <p className="text-xs text-zinc-400">Perform with proper form and progressive overload.</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold">
                  {activeCategory.exercises.length} Exercises
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeCategory.exercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 font-bold text-xs">
                          0{idx + 1}
                        </div>
                        <h5 className="font-bold text-zinc-100 text-base">{ex.name}</h5>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 text-xs font-bold border border-zinc-800">
                        {ex.sets}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 text-xs font-bold border border-zinc-800">
                        {ex.reps}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 italic pt-1 border-t border-zinc-900">
                      💡 Note: {ex.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Check-In History */}
        {activeTab === 'attendance' && (
          <MemberCheckIns checkIns={member.checkIns} />
        )}

        {/* Tab 4: Gym Info */}
        {activeTab === 'gym' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <SpotlightCard className="overflow-hidden p-0">
              <div className="h-32 bg-zinc-800 bg-[url('/images/owner.jpg'),_url('/996d2593-0390-4e29-80f1-932c54bf779e.jpeg')] bg-cover bg-center">
                <div className="h-full w-full bg-black/60 backdrop-blur-sm" />
              </div>

              <div className="px-6 pb-6 pt-0">
                <div className="-mt-12 mb-4 inline-flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-zinc-900 bg-white shadow-xl overflow-hidden">
                  <img
                    src="/images/owner.jpg"
                    onError={(e) => {
                      e.target.src = '/996d2593-0390-4e29-80f1-932c54bf779e.jpeg';
                    }}
                    alt="Kushal Solanke - Owner"
                    className="h-full w-full object-cover"
                  />
                </div>

                <h3 className="text-2xl font-black tracking-tight text-white">Guru Fitness Health Club</h3>
                <p className="text-sm font-medium text-zinc-400">Head Coach & Owner: Kushal Solanke</p>

                <div className="mt-6 space-y-4 rounded-2xl bg-black/40 p-4 border border-white/5">
                  <div className="flex items-start gap-3 text-sm text-zinc-300">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <span>
                      Guru Fitness Health Club,<br />
                      Datta Mandir Chowk,<br />
                      Dhule, Maharashtra
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <a
                    href="https://wa.me/919130564188?text=Hi%20Kushal%2C%20I%20am%20a%20Guru%20Fitness%20member."
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-zinc-950 transition-all hover:bg-zinc-200"
                  >
                    <Phone className="h-4 w-4 text-emerald-600" /> WhatsApp
                  </a>
                  <a
                    href="https://www.instagram.com/guru_fitness_dhule/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 py-3.5 text-sm font-bold text-white transition-all hover:border-pink-500/50 hover:bg-zinc-800"
                  >
                    <InstagramIcon className="h-4 w-4 text-pink-400" /> Instagram
                  </a>
                </div>
              </div>
            </SpotlightCard>
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-zinc-950/80 px-6 pt-3 backdrop-blur-xl md:bottom-6 md:left-1/2 md:right-auto md:w-[420px] md:-translate-x-1/2 md:rounded-3xl md:border md:pb-3 md:shadow-2xl">
        <div className="flex items-center justify-between">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-1.5 p-2 transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {isActive && (
                  <span className="absolute -top-3 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
                )}
                <Icon
                  className={`h-6 w-6 transition-all duration-300 ${
                    isActive ? 'scale-110 stroke-[2.5px]' : 'scale-100 stroke-2'
                  }`}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

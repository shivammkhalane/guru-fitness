import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { UserRound, IndianRupee, CheckCircle2, Clock, TrendingUp } from 'lucide-react'

const TRAINERS = [
  {
    name: 'Rahul Sharma',
    specialty: 'Strength & Conditioning',
    sessions: 42,
    target: 50,
    rate: 450,
    avatar: 'RS',
    status: 'On Floor',
  },
  {
    name: 'Pooja Patil',
    specialty: 'Yoga & Flexibility',
    sessions: 38,
    target: 45,
    rate: 450,
    avatar: 'PP',
    status: 'On Floor',
  },
  {
    name: 'Amit Verma',
    specialty: 'Cardio & HIIT',
    sessions: 28,
    target: 40,
    rate: 400,
    avatar: 'AV',
    status: 'Break',
  },
]

const RATE_PER_SESSION = 450

export default function PTTrainerCommissionTracker() {
  const [mounted, setMounted] = useState(false)
  const cardRef = useRef(null)
  const rowRefs = useRef([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !cardRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    animate(cardRef.current, {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      ease: 'outExpo',
    })

    const timer = setTimeout(() => {
      rowRefs.current.forEach((row, index) => {
        if (!row) return
        animate(row, {
          opacity: [0, 1],
          x: [-12, 0],
          duration: 450,
          delay: stagger(140, { from: index }),
          ease: 'outExpo',
        })
      })
    }, 250)

    return () => clearTimeout(timer)
  }, [mounted])

  const totalSessions = TRAINERS.reduce((sum, t) => sum + t.sessions, 0)
  const totalTarget = TRAINERS.reduce((sum, t) => sum + t.target, 0)
  const totalPayout = TRAINERS.reduce((sum, t) => sum + t.sessions * t.rate, 0)

  return (
    <div ref={cardRef} className="admin-glass-panel pt-tracker-panel">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-panel-kicker">Trainer Management</p>
          <h2>PT &amp; Trainer Commission</h2>
        </div>
      </div>

      <div className="pt-summary-grid">
        <div className="pt-stat">
          <span className="pt-stat-label">Total Sessions</span>
          <strong className="pt-stat-value">{totalSessions}</strong>
          <span className="pt-stat-sub">of {totalTarget} target</span>
        </div>
        <div className="pt-stat">
          <span className="pt-stat-label">Payout This Month</span>
          <strong className="pt-stat-value payout">₹{totalPayout.toLocaleString('en-IN')}</strong>
          <span className="pt-stat-sub">@ ₹{RATE_PER_SESSION}/session</span>
        </div>
      </div>

      <div className="pt-trainers">
        {TRAINERS.map((trainer, index) => {
          const pct = Math.round((trainer.sessions / trainer.target) * 100)
          const payout = trainer.sessions * trainer.rate
          const isOnBreak = trainer.status === 'Break'
          return (
            <div
              key={trainer.name}
              ref={(el) => (rowRefs.current[index] = el)}
              className="pt-trainer-row"
            >
              <div className="pt-avatar">
                <span>{trainer.avatar}</span>
                <i
                  className={`status-dot ${isOnBreak ? 'status-dot-amber' : 'status-dot-online'}`}
                  title={trainer.status}
                />
              </div>

              <div className="pt-body">
                <div className="pt-head">
                  <span className="pt-name">{trainer.name}</span>
                  <span className="pt-status" style={{ color: isOnBreak ? '#f59e0b' : '#10b981' }}>
                    {trainer.status}
                  </span>
                </div>
                <span className="pt-specialty">{trainer.specialty}</span>

                <div className="pt-progress">
                  <div className="pt-progress-track">
                    <div
                      className="pt-progress-fill"
                      style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#3b3b3b' }}
                    />
                  </div>
                  <span className="pt-pct">{pct}%</span>
                </div>

                <div className="pt-stats">
                  <span><CheckCircle2 size={12} /> {trainer.sessions} sessions</span>
                  <span><IndianRupee size={12} /> ₹{payout.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-footer">
        <TrendingUp size={14} className="text-emerald-400" />
        <span>Commission auto-calculated at ₹450/session. Payouts processed on the 1st of each month.</span>
      </div>
    </div>
  )
}
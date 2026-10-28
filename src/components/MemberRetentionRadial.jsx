import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { Users, UserX, AlertTriangle } from 'lucide-react'

const SEGMENTS = [
  { label: 'Active', value: 75, color: '#10b981', glow: 'rgba(16,185,129,0.5)' },
  { label: 'At Risk', value: 15, color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
  { label: 'Cancelled', value: 10, color: '#ef4444', glow: 'rgba(239,68,68,0.5)' },
]

const RADIUS = 70
const STROKE = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function MemberRetentionRadial() {
  const [mounted, setMounted] = useState(false)
  const pathsRef = useRef([])
  const centerRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Animate the center percentage text
    if (centerRef.current) {
      const counter = { value: 0 }
      animate(counter, {
        value: 100,
        duration: 1500,
        ease: 'outExpo',
        onUpdate: () => {
          if (centerRef.current) centerRef.current.textContent = `${Math.round(counter.value)}%`
        },
      })
    }

    // Draw each donut ring segment
    pathsRef.current.forEach((path, index) => {
      if (!path) return
      const segment = SEGMENTS[index]
      const offset = SEGMENTS.slice(0, index).reduce((sum, s) => sum + s.value, 0)
      const dashLength = (segment.value / 100) * CIRCUMFERENCE
      const dashOffset = -(offset / 100) * CIRCUMFERENCE

      path.setAttribute('stroke-dasharray', `${dashLength} ${CIRCUMFERENCE}`)
      path.setAttribute('stroke-dashoffset', String(dashOffset))

      animate(path, {
        strokeDashoffset: [dashOffset + dashLength, dashOffset],
        duration: 1500,
        delay: index * 250,
        ease: 'outExpo',
      })
    })
  }, [mounted])

  const totalActive = SEGMENTS[0].value

  return (
    <div className="admin-glass-panel retention-panel">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-panel-kicker">Retention</p>
          <h2>Member Retention</h2>
        </div>
      </div>

      <div className="retention-chart-wrap">
        <svg viewBox="0 0 180 180" className="retention-donut" aria-label="Member retention: 75% active, 15% at risk, 10% cancelled">
          <circle
            cx="90"
            cy="90"
            r={RADIUS}
            fill="none"
            stroke="rgb(255 255 255 / 0.06)"
            strokeWidth={STROKE}
          />
          {SEGMENTS.map((segment, index) => (
            <circle
              key={segment.label}
              ref={(el) => (pathsRef.current[index] = el)}
              cx="90"
              cy="90"
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              style={{
                transformOrigin: '90px 90px',
                transform: 'rotate(-90deg)',
                filter: `drop-shadow(0 0 6px ${segment.glow})`,
              }}
            />
          ))}
          <text x="90" y="86" textAnchor="middle" className="retention-center-value" ref={centerRef}>
            0%
          </text>
          <text x="90" y="106" textAnchor="middle" className="retention-center-label">Active</text>
        </svg>

        <div className="retention-legend">
          {SEGMENTS.map((segment) => (
            <div key={segment.label} className="retention-legend-item">
              <span
                className="retention-legend-dot"
                style={{ background: segment.color, boxShadow: `0 0 8px ${segment.glow}` }}
              />
              <span className="retention-legend-text">
                <strong>{segment.value}%</strong>
                <span>{segment.label}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
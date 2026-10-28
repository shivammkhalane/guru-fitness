import { useEffect, useRef, useState } from 'react'
import { Clock3, Flame } from 'lucide-react'
import { animate, stagger } from 'animejs'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 16 }, (_, index) => index + 6) // 6 AM – 10 PM

const formatHour = (hour) => {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}${suffix}`.padStart(4, ' ')
}

// Mock attendance: peak hours are 6-8 AM and 6-9 PM (typical gym patterns)
const generateMockData = () => {
  const grid = []
  let seed = 7385621
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let d = 0; d < 7; d++) {
    const row = []
    for (let h = 0; h < 16; h++) {
      const hour = HOURS[h]
      const isPeak = (hour >= 6 && hour <= 8) || (hour >= 18 && hour <= 21)
      const base = isPeak ? 30 : 5
      const value = Math.round(base + rand() * 45)
      row.push(value)
    }
    grid.push(row)
  }
  return grid
}

const intensityClass = (value) => {
  if (value >= 35) return 'heatmap-cell-peak'
  if (value >= 20) return 'heatmap-cell-high'
  if (value >= 10) return 'heatmap-cell-mid'
  if (value >= 3) return 'heatmap-cell-low'
  return 'heatmap-cell-empty'
}

export default function PeakHoursHeatmapGrid() {
  const [data] = useState(generateMockData)
  const gridRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !gridRef.current) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const cells = gridRef.current.querySelectorAll('.heatmap-cell')
    animate(cells, {
      opacity: [0, 1],
      scale: [0.4, 1],
      duration: 600,
      delay: stagger(45, { from: 'center' }),
      ease: 'outExpo',
    })
  }, [mounted])

  const maxVal = Math.max(0, ...data.flat())

  return (
    <section className="admin-glass-panel heatmap-grid-panel">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-panel-kicker">Weekly</p>
          <h2>Peak Hours Heatmap</h2>
        </div>
        <div className="heatmap-legend" aria-hidden="true">
          <span className="heatmap-legend-label">Less</span>
          <span className="heatmap-swatch heatmap-cell-empty" />
          <span className="heatmap-swatch heatmap-cell-low" />
          <span className="heatmap-swatch heatmap-cell-mid" />
          <span className="heatmap-swatch heatmap-cell-high" />
          <span className="heatmap-swatch heatmap-cell-peak" />
          <span className="heatmap-legend-label">More</span>
        </div>
      </div>

      <div className="heatmap-grid-wrap">
        <div className="heatmap-hours" aria-hidden="true">
          <span />
          {HOURS.map((hour) => (
            <span key={hour} title={`${formatHour(hour)}`}>
              {formatHour(hour)}
            </span>
          ))}
        </div>

        <div ref={gridRef} className="heatmap-grid">
          {data.map((row, dayIdx) => (
            <div className="heatmap-row" key={DAYS[dayIdx]}>
              <span className="heatmap-day-label">{DAYS[dayIdx]}</span>
              {row.map((value, hourIdx) => (
                <span
                  key={hourIdx}
                  className={`heatmap-cell ${intensityClass(value)}`}
                  title={`${DAYS[dayIdx]} ${formatHour(HOURS[hourIdx])}: ${value} check-ins`}
                  style={{ '--heatmap-value': value, '--heatmap-max': maxVal }}
                >
                  {value >= 10 ? <small>{value}</small> : null}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap-summary">
        <span className="heatmap-stat">
          <Flame size={14} className="text-emerald-400" /> Peak window: 6–9 AM &amp; 6–9 PM
        </span>
        <span className="heatmap-stat">7 days × 16 hours (6 AM – 10 PM)</span>
      </div>
    </section>
  )
}
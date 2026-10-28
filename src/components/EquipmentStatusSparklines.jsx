import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { CheckCircle2, Clock, Wrench } from 'lucide-react'

const EQUIPMENT = [
  {
    name: 'Treadmills',
    icon: CheckCircle2,
    status: 'Operational',
    uptime: 98,
    color: '#10b981',
    points: [8, 9, 8, 10, 9, 9, 10, 10, 9, 10, 10, 10, 9, 10, 10, 10, 9, 10, 10, 10, 10, 10, 10, 10],
  },
  {
    name: 'Ellipticals',
    icon: Clock,
    status: 'Minor Wear',
    uptime: 87,
    color: '#f59e0b',
    points: [7, 8, 7, 8, 8, 7, 8, 8, 9, 8, 8, 9, 8, 9, 9, 8, 9, 9, 9, 8, 9, 9, 9, 8],
  },
  {
    name: 'Squat Racks',
    icon: Wrench,
    status: 'Under Maintenance',
    uptime: 72,
    color: '#ef4444',
    points: [5, 6, 5, 7, 6, 7, 6, 8, 7, 8, 7, 8, 8, 7, 8, 8, 8, 7, 8, 8, 8, 7, 8, 8],
  },
]

const SPARK_WIDTH = 120
const SPARK_HEIGHT = 40

const buildPath = (points) => {
  if (!points.length) return ''
  const step = SPARK_WIDTH / (points.length - 1)
  const max = Math.max(...points)
  return points
    .map((value, index) => {
      const x = index * step
      const y = SPARK_HEIGHT - (value / max) * (SPARK_HEIGHT - 4) - 2
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

const buildAreaPath = (points) => {
  const line = buildPath(points)
  return `${line} L ${SPARK_WIDTH} ${SPARK_HEIGHT} L 0 ${SPARK_HEIGHT} Z`
}

export default function EquipmentStatusSparklines() {
  const [mounted, setMounted] = useState(false)
  const cardRefs = useRef([])
  const pathRefs = useRef([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Stagger-fade the cards in
    cardRefs.current.forEach((card, index) => {
      if (!card) return
      animate(card, {
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 500,
        delay: stagger(180, { from: index }),
        ease: 'outExpo',
      })
    })

    // Draw the sparkline paths after a short delay
    const timer = setTimeout(() => {
      pathRefs.current.forEach((path, index) => {
        if (!path) return
        const full = buildPath(EQUIPMENT[index].points)
        // Start with an empty path and animate to full length
        path.setAttribute('d', '')
        animate(path, {
          strokeDashoffset: [0, -full.length],
          duration: 1200,
          delay: index * 200,
          ease: 'outExpo',
          complete: () => path.setAttribute('d', full),
        })
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [mounted])

  return (
    <div className="admin-glass-panel equipment-panel">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-panel-kicker">Equipment</p>
          <h2>Equipment Status</h2>
        </div>
      </div>

      <div className="equipment-list">
        {EQUIPMENT.map((item, index) => {
          const Icon = item.icon
          return (
            <div
              key={item.name}
              ref={(el) => (cardRefs.current[index] = el)}
              className="equipment-card"
            >
              <div className="equipment-icon" style={{ color: item.color, background: `${item.color}18` }}>
                <Icon size={18} />
              </div>

              <div className="equipment-body">
                <div className="equipment-top">
                  <span className="equipment-name">{item.name}</span>
                  <span className="equipment-status" style={{ color: item.color }}>{item.status}</span>
                </div>

                <div className="equipment-spark">
                  <svg viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`} className="spark-svg">
                    <path
                      ref={(el) => (pathRefs.current[index] = el)}
                      d=""
                      fill="none"
                      stroke={item.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ filter: `drop-shadow(0 0 4px ${item.color}88)` }}
                    />
                    <path
                      d={buildAreaPath(item.points)}
                      fill={item.color}
                      opacity="0.12"
                    />
                  </svg>
                </div>

                <div className="equipment-bottom">
                  <span className="equipment-uptime">
                    <strong style={{ color: item.color }}>{item.uptime}%</strong>
                    <span>uptime (24h)</span>
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
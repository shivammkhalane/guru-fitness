import { Clock3 } from 'lucide-react'

const HOURS = Array.from({ length: 15 }, (_, index) => index + 6)

const readHour = (time) => {
  const value = String(time || '').trim()
  const match = value.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i)
  if (!match) return null

  let hour = Number(match[1])
  const suffix = match[3]?.toUpperCase()
  if (suffix === 'PM' && hour < 12) hour += 12
  if (suffix === 'AM' && hour === 12) hour = 0
  return hour
}

const formatHour = (hour) => {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12} ${suffix}`
}

export default function PeakHoursHeatmap({ attendance = [] }) {
  const counts = new Map(HOURS.map((hour) => [hour, 0]))
  attendance.forEach((record) => {
    const hour = readHour(record.time || record.checkInTime)
    if (counts.has(hour)) counts.set(hour, counts.get(hour) + 1)
  })

  const peak = Math.max(0, ...counts.values())
  const hasData = attendance.length > 0
  const mappedCheckins = [...counts.values()].reduce((total, count) => total + count, 0)
  const outsideDisplayHours = attendance.length - mappedCheckins

  return (
    <article className="dashboard-panel analytics-panel">
      <div className="dashboard-panel-heading">
        <div><p className="section-kicker">Today</p><h2>Peak hours</h2></div>
        <span className="heatmap-total"><Clock3 size={15} /> {attendance.length} check-ins</span>
      </div>
      {hasData ? (
        <>
          <div className="peak-hours-chart" role="img" aria-label="Today's check-ins by hour from 6 AM to 8 PM">
            {HOURS.map((hour) => {
              const count = counts.get(hour)
              const intensity = peak ? count / peak : 0
              return (
                <div className="peak-hour-column" key={hour} title={`${formatHour(hour)}: ${count} check-in${count === 1 ? '' : 's'}`}>
                  <span className="peak-hour-count">{count || ''}</span>
                  <i
                    className={count ? 'has-checkins' : ''}
                    style={{ '--hour-intensity': intensity }}
                    aria-hidden="true"
                  />
                  <small>{hour % 3 === 0 || hour === 20 ? formatHour(hour) : ''}</small>
                </div>
              )
            })}
          </div>
          {outsideDisplayHours > 0 && (
            <p className="analytics-state">{outsideDisplayHours} check-in{outsideDisplayHours === 1 ? '' : 's'} outside the 6 AM–8 PM chart range.</p>
          )}
        </>
      ) : (
        <p className="analytics-state">No check-ins recorded today. Hourly activity will appear here.</p>
      )}
    </article>
  )
}

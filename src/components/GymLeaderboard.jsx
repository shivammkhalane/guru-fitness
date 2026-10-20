import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Crown, MonitorUp, X } from 'lucide-react'
import { dataService } from '../services/dataService'
import useModalA11y from '../hooks/useModalA11y'

const podiumClasses = ['first', 'second', 'third']
const EMPTY_MEMBERS = []

export default function GymLeaderboard({ members = EMPTY_MEMBERS }) {
  const [result, setResult] = useState({ signature: '', rows: [], error: '' })
  const [isWallDisplayOpen, setIsWallDisplayOpen] = useState(false)
  const wallDisplayRef = useRef(null)
  useModalA11y(isWallDisplayOpen, wallDisplayRef, () => setIsWallDisplayOpen(false))
  const memberSignature = members
    .map((member) => `${member.id || ''}:${member.memberId || ''}:${member.name || ''}`)
    .join('|')

  useEffect(() => {
    let cancelled = false

    dataService.getAttendanceLeaderboard(members)
      .then((leaderboard) => {
        if (!cancelled) setResult({ signature: memberSignature, rows: leaderboard, error: '' })
      })
      .catch((loadError) => {
        if (!cancelled) {
          setResult({
            signature: memberSignature,
            rows: [],
            error: loadError.message || 'Unable to load the attendance leaderboard.',
          })
        }
      })

    return () => { cancelled = true }
  }, [members, memberSignature])

  const loading = result.signature !== memberSignature
  const rows = loading ? [] : result.rows
  const error = loading ? '' : result.error

  const leaderboardContent = (
    <>
      {loading ? (
        <p className="analytics-state" role="status">Loading attendance streaks…</p>
      ) : error ? (
        <p className="analytics-state analytics-error" role="alert">{error}</p>
      ) : rows.length ? (
        <ol className="leaderboard-list">
          {rows.slice(0, 10).map((row, index) => (
            <li className={`leaderboard-row ${podiumClasses[index] || ''}`} key={row.memberId}>
              <span className="leaderboard-rank">{index === 0 && <Crown size={16} />} #{index + 1}</span>
              <span className="leaderboard-member">{row.name}</span>
              <strong>{row.streak}<small> day{row.streak === 1 ? '' : 's'}</small></strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="analytics-state">No current check-in streaks to display.</p>
      )}
    </>
  )

  return (
    <>
      <article className="dashboard-panel analytics-panel">
        <div className="dashboard-panel-heading">
          <div><p className="section-kicker">Consistency counts</p><h2>Gym leaderboard</h2></div>
          <button
            className="analytics-icon-button"
            type="button"
            onClick={() => setIsWallDisplayOpen(true)}
            aria-label="Open wall display"
            title="Open wall display"
          >
            <MonitorUp size={17} />
          </button>
        </div>
        {leaderboardContent}
      </article>

      {isWallDisplayOpen && (
        <div className="leaderboard-tv-overlay" role="dialog" aria-modal="true" aria-labelledby="leaderboard-tv-title" ref={wallDisplayRef}>
          <button
            type="button"
            className="leaderboard-tv-close"
            onClick={() => setIsWallDisplayOpen(false)}
            aria-label="Close wall display"
          >
            <X size={22} />
          </button>
          <header>
            <p className="section-kicker">Guru Fitness</p>
            <h2 id="leaderboard-tv-title">Attendance streaks</h2>
            <p>Consistency is the strongest kind of progress.</p>
          </header>
          <div className="leaderboard-tv-content">{leaderboardContent}</div>
          <span className="leaderboard-tv-footer"><ArrowUpRight size={16} /> Updated from recorded check-ins</span>
        </div>
      )}
    </>
  )
}

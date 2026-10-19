import { useEffect, useState } from 'react'
import { AlertTriangle, LoaderCircle, RefreshCw, Send } from 'lucide-react'
import { dataService } from '../services/dataService'

export default function ChurnRadar() {
  const [result, setResult] = useState({ members: [], error: '', loading: true })
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    dataService.getMembersAtRiskOfChurn()
      .then((members) => {
        if (!cancelled) setResult({ members, error: '', loading: false })
      })
      .catch((error) => {
        if (!cancelled) {
          setResult({
            members: [],
            error: error.message || 'Unable to load attendance risk data.',
            loading: false,
          })
        }
      })

    return () => { cancelled = true }
  }, [refreshVersion])

  const sendReminder = (member) => {
    console.log('Reminder requested for at-risk member:', {
      memberId: member.id,
      memberCode: member.memberCode,
      name: member.name,
    })
  }

  return (
    <article className="dashboard-panel churn-radar-panel">
      <div className="dashboard-panel-heading">
        <div>
          <p className="section-kicker">Member retention</p>
          <h2>At risk</h2>
        </div>
        <button
          className="churn-refresh-button"
          type="button"
          onClick={() => setRefreshVersion((version) => version + 1)}
          aria-label="Refresh at-risk members"
          title="Refresh"
          disabled={result.loading}
        >
          {result.loading ? <LoaderCircle size={16} className="churn-loading-icon" /> : <RefreshCw size={16} />}
        </button>
      </div>

      {result.loading ? (
        <p className="churn-state" role="status"><LoaderCircle size={16} className="churn-loading-icon" /> Checking recent attendance…</p>
      ) : result.error ? (
        <div className="churn-state churn-state-error" role="alert">
          <p>{result.error}</p>
          <button type="button" className="text-action" onClick={() => setRefreshVersion((version) => version + 1)}>Try again</button>
        </div>
      ) : result.members.length ? (
        <ul className="churn-member-list">
          {result.members.slice(0, 8).map((member) => (
            <li className="churn-member-row" key={member.id}>
              <span className="churn-member-icon"><AlertTriangle size={17} aria-hidden="true" /></span>
              <span className="churn-member-copy">
                <strong>{member.name}</strong>
                <small>
                  {member.daysSinceLastVisit == null
                    ? 'No visits recorded'
                    : `${member.daysSinceLastVisit} days since last visit`}
                </small>
              </span>
              <button
                type="button"
                className="churn-reminder-button"
                onClick={() => sendReminder(member)}
                aria-label={`Send reminder to ${member.name}`}
              >
                <Send size={14} aria-hidden="true" />
                <span>Remind</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="churn-state">No active members are currently flagged by attendance.</p>
      )}
    </article>
  )
}

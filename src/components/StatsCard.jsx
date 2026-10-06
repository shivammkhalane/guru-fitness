export default function StatsCard({ label, value, accent = 'dark' }) {
  return (
    <div className={`stats-card ${accent}`}>
      <span className="stats-label">{label}</span>
      <strong className="stats-value">{value}</strong>
    </div>
  )
}

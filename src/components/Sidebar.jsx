export default function Sidebar({ navItems, currentView, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand-box">
        <div className="brand-mark">GF</div>
        <div>
          <p className="brand-title">Guru Fitness</p>
          <p className="brand-subtitle">Health Club</p>
        </div>
      </div>

      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav-item ${currentView === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

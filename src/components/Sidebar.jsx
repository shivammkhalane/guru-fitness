import { CalendarCheck2, ChartNoAxesCombined, CreditCard, LayoutDashboard, Settings2, UsersRound, WalletCards } from 'lucide-react'

const navIcons = {
  dashboard: LayoutDashboard,
  scan: CalendarCheck2,
  members: UsersRound,
  memberships: WalletCards,
  payments: CreditCard,
  settings: Settings2,
  reports: ChartNoAxesCombined,
}

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
            aria-current={currentView === item.key ? 'page' : undefined}
            onClick={() => onNavigate(item.key)}
          >
            <span className="nav-icon">{(() => { const Icon = navIcons[item.key]; return Icon ? <Icon size={18} strokeWidth={1.8} /> : null })()}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

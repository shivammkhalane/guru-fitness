import { BookOpen, CalendarCheck2, CreditCard, LayoutDashboard, LogOut, Settings2, UserRoundPlus, UsersRound, WalletCards } from 'lucide-react'

const navIcons = {
  dashboard: LayoutDashboard,
  attendance: CalendarCheck2,
  scan: CalendarCheck2,
  members: UsersRound,
  memberships: WalletCards,
  payments: CreditCard,
  settings: Settings2,
  exercises: BookOpen,
}

const navGroups = [
  { label: 'Main', keys: ['dashboard', 'attendance', 'scan', 'members', 'memberships', 'exercises'] },
  { label: 'Business', keys: ['payments', 'settings'] },
]

const defaultNavItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'attendance', label: "Today's Attendance" },
  { key: 'members', label: 'Members' },
  { key: 'payments', label: 'Payments' },
  { key: 'exercises', label: 'Exercise library' },
  { key: 'settings', label: 'Settings' },
]

export default function Sidebar({
  navItems = defaultNavItems,
  activeTab,
  setActiveTab,
  onOpenAddMember,
  currentView,
  onNavigate,
  userEmail,
  userRole,
  onLogout,
}) {
  const selectedTab = activeTab ?? currentView
  const navigate = setActiveTab ?? onNavigate
  const itemsByKey = new Map(navItems.map((item) => [item.key, item]))
  const normalizedRole = String(userRole || '').toLowerCase()
  const accountRole = ['owner', 'admin', 'staff'].includes(normalizedRole)
    ? `${normalizedRole[0].toUpperCase()}${normalizedRole.slice(1)}`
    : 'Gym account'

  return (
    <aside className="sidebar fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-zinc-200 bg-white">
      <div className="brand-box">
        <div className="brand-mark">GF</div>
        <div>
          <p className="brand-title">Guru Fitness</p>
          <p className="brand-subtitle">Health Club</p>
        </div>
      </div>

      <nav className="nav-list" aria-label="Main navigation">
        {navGroups.map((group) => {
          const groupItems = group.keys.map((key) => itemsByKey.get(key)).filter(Boolean)
          if (!groupItems.length) return null

          return (
            <div className="nav-section" key={group.label}>
              <p className="nav-section-label">{group.label}</p>
              {groupItems.map((item) => {
                const Icon = navIcons[item.key]
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`nav-item rounded-md ${
                      selectedTab === item.key || (item.key === 'attendance' && selectedTab === 'scan')
                        ? 'active bg-zinc-100 text-zinc-950 font-medium'
                        : 'text-zinc-500 hover:bg-zinc-100/50 hover:text-zinc-950'
                    }`}
                    aria-current={selectedTab === item.key || (item.key === 'attendance' && selectedTab === 'scan') ? 'page' : undefined}
                    onClick={() => navigate(item.key)}
                  >
                    <span className="nav-icon">{Icon && <Icon size={18} strokeWidth={1.8} />}</span>
                    <span>{item.key === 'scan' || item.key === 'attendance' ? 'Attendance' : item.label}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      {onOpenAddMember && (
        <button
          type="button"
          className="sidebar-add-member bg-zinc-900 hover:bg-zinc-900/90 text-zinc-50 h-9 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm inline-flex items-center justify-center"
          onClick={onOpenAddMember}
        >
          <UserRoundPlus size={17} strokeWidth={1.8} />
          <span>New Member</span>
        </button>
      )}

      <div className="sidebar-account">
        <div className="sidebar-account-avatar">{(userEmail || 'GF').slice(0, 1).toUpperCase()}</div>
        <div className="sidebar-account-details">
          <strong>{userEmail || 'Demo session'}</strong>
          <span>{accountRole}</span>
        </div>
        {onLogout && (
          <button type="button" className="sidebar-logout" onClick={onLogout} aria-label="Log out" title="Log out">
            <LogOut size={17} strokeWidth={1.8} />
          </button>
        )}
      </div>
    </aside>
  )
}

export default function Dashboard({ onOpenAddMember, onNavigate, children }) {
  return (
    <div className="dashboard-content min-h-full bg-background">
      {typeof children === 'function'
        ? children({ onOpenAddMember, onNavigate })
        : children}
    </div>
  )
}
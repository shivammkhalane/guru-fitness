export default function ToastList({ toasts }) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.type === 'warning' ? '⚠' : '✓'} {toast.message}
        </div>
      ))}
    </div>
  )
}

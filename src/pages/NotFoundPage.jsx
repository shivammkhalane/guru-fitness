import { Link } from 'react-router-dom'
import { PolicyFooter } from './PolicyPage'

export default function NotFoundPage() {
  return (
    <main id="main-content" className="public-info-page">
      <section className="public-info-card not-found-card">
        <p className="policy-draft-badge">Page not found</p>
        <h1>This page isn’t available</h1>
        <p>The address may be incorrect, or the page may have moved.</p>
        <Link className="btn-primary" to="/">Return to sign-in</Link>
      </section>
      <PolicyFooter />
    </main>
  )
}

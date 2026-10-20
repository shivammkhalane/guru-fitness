import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const policyContent = {
  '/privacy': {
    title: 'Privacy notice',
    description: 'Draft explanation of data processed by the Guru Fitness management app.',
    heading: 'Privacy notice',
    sections: [
      ['Draft status', 'This notice is a draft for the gym owner and qualified local counsel to review. No verified privacy contact or retention schedule is configured.'],
      ['Information used', 'The app can process member names, phone numbers, membership and attendance history, payment records entered by staff, profile photos, and QR tokens. Staff account details and member sign-in phone numbers are also processed.'],
      ['Why it is used', 'The information supports gym administration, membership access, attendance, payment records, member sign-in, and requested QR-pass delivery. Payment details are recorded by staff; this app does not itself process card payments.'],
      ['Service providers', 'When configured, Supabase provides authentication, database and file storage. Google sign-in is available as an identity provider. Member sign-in can send a verification SMS through the configured Supabase authentication provider. QR-pass delivery can send a signed image URL and membership information through Meta WhatsApp. The exercise library fetches exercise data and images from its external dataset provider.'],
      ['Browser storage and demonstration mode', 'The app stores the selected theme in browser local storage. In local demonstration mode, example records and settings are also kept in this browser and are not live gym records.'],
      ['Retention and deletion', 'The production database retention schedule is not configured in this app. A signed-in member with a linked portal account can submit a deletion request from the member portal. Submission creates a request for authorized staff; it does not immediately delete records. Staff must review and update its status. Some financial or operational records may need to be retained; the owner and counsel must confirm applicable requirements.'],
      ['Security and access', 'The app relies on Supabase authentication and row-level security policies in the deployed project. This notice does not certify that a project has applied all migrations or that its configuration has been independently audited.'],
      ['Contact', 'No verified privacy contact channel is configured. The gym owner must add an approved contact channel before publishing this notice.'],
    ],
  },
  '/terms': {
    title: 'Terms and conditions (draft)',
    description: 'Unapproved draft terms for the private Guru Fitness management and member portal.',
    heading: 'Terms and conditions',
    sections: [
      ['Draft status', 'This is an unapproved draft, not a contract or legal advice. The gym owner must confirm the operator identity, applicable jurisdiction, member access rules, fees, cancellation terms, and support contact before use.'],
      ['App purpose', 'The application provides gym staff tools for member, attendance, membership, and payment-record administration, plus a member portal when enabled. It does not itself collect online payments.'],
      ['Account access', 'Users should use only accounts authorized for their role. Staff access depends on the deployed authentication and database authorization configuration. Members should protect their sign-in verification codes.'],
      ['Unconfirmed terms', 'No service guarantees, refund promises, pricing commitments, opening hours, or governing-law terms are stated here. These require owner approval and jurisdiction-specific legal review.'],
    ],
  },
  '/cookies': {
    title: 'Cookie and storage notice',
    description: 'Draft notice about cookies and browser storage used by the Guru Fitness app.',
    heading: 'Cookie and storage notice',
    sections: [
      ['Draft status', 'This notice is a draft for owner review.'],
      ['Optional tracking', 'No analytics, advertising, or other non-essential tracking script was found in the application source during this review. No optional analytics consent banner is shown because no optional tracking is configured.'],
      ['Essential storage', 'The theme preference and local demonstration records use browser local storage. Supabase authentication may persist a signed-in session in browser storage. These are used for the selected interface, local demo, or account session rather than advertising.'],
      ['External resources', 'The application can contact Supabase, Google for Google sign-in, the configured SMS provider via Supabase, Meta WhatsApp for requested notifications, and the external exercise dataset and its image hosts when those features are used.'],
      ['Changing preferences', 'The theme can be changed from the appearance control. Signing out ends the active Supabase session. Since no optional tracking is configured, there are no optional analytics preferences to withdraw.'],
    ],
  },
  '/refunds': {
    title: 'Refund and cancellation policy (draft)',
    description: 'Unapproved placeholder for owner-approved refund and cancellation terms.',
    heading: 'Refund and cancellation policy',
    sections: [
      ['Draft status', 'No refund or cancellation terms have been verified. This page intentionally does not promise refunds, set deadlines, or state that fees are non-refundable.'],
      ['Owner action required', 'Before publishing, the gym owner must provide the approved rules for membership cancellation, unused time, payment errors, refunds, and the verified contact channel for requests. A qualified reviewer should confirm applicable local consumer requirements.'],
      ['App limitation', 'The app records payments entered by staff; it does not initiate or refund payments. A payment record in the app is not proof that a bank or payment provider has settled funds.'],
    ],
  },
}

export function PolicyFooter() {
  const [currentYear] = useState(() => new Date().getFullYear())

  return (
    <footer className="policy-footer">
      <nav aria-label="Policy pages">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms (draft)</Link>
        <Link to="/cookies">Cookies</Link>
        <Link to="/refunds">Refunds (draft)</Link>
      </nav>
      <small>© {currentYear} · Policy drafts require owner approval.</small>
    </footer>
  )
}

export default function PolicyPage() {
  const { pathname } = useLocation()
  const page = policyContent[pathname]

  useEffect(() => {
    document.title = `${page.title} | Guru Fitness`
    const description = document.querySelector('meta[name="description"]')
    description?.setAttribute('content', page.description)
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, nofollow')
  }, [page])

  return (
    <main id="main-content" className="public-info-page">
      <a className="public-info-brand" href="/" aria-label="Return to Guru Fitness sign-in">Guru Fitness</a>
      <article className="public-info-card">
        <p className="policy-draft-badge">Draft · owner review required</p>
        <h1>{page.heading}</h1>
        {page.sections.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
        {pathname === '/privacy' && (
          <section>
            <h2>Submit a data deletion request</h2>
            <p>
              Members with a linked, verified portal account can submit a request after signing in. If your account is not linked, this app has no verified public contact channel; the owner must configure one.
            </p>
            <Link className="btn-outline" to="/member">Open member sign-in</Link>
          </section>
        )}
      </article>
      <PolicyFooter />
    </main>
  )
}

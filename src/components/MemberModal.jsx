import { useRef } from 'react'
import useModalA11y from '../hooks/useModalA11y'

export default function MemberModal({
  memberForm,
  setMemberForm,
  membershipPlans,
  selectedPlan,
  fieldErrors,
  photoSelection,
  photoError,
  isSubmitting,
  onClose,
  onSubmit,
  onPhotoChange,
  getPlanExpiryDate,
  getTodayIsoKolkata,
  toDateInputValue,
}) {
  const dialogRef = useRef(null)
  useModalA11y(true, dialogRef, onClose)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="modal-panel registration-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-member-title"
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="add-member-title">Add Member</h2>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close dialog">×</button>
        </div>

        <form onSubmit={onSubmit} className="member-form">
          <div className="field-row two-up">
            <label>
              <span>Full Name</span>
              <input className="input" type="text" value={memberForm.fullName} onChange={(event) => setMemberForm((prev) => ({ ...prev, fullName: event.target.value }))} aria-invalid={Boolean(fieldErrors.fullName)} aria-describedby={fieldErrors.fullName ? 'member-name-error' : undefined} />
              {fieldErrors.fullName && <small className="photo-upload-error" id="member-name-error">{fieldErrors.fullName}</small>}
            </label>
            <label>
              <span>Phone Number</span>
              <input className="input" type="tel" value={memberForm.phone} onChange={(event) => setMemberForm((prev) => ({ ...prev, phone: event.target.value }))} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'member-phone-error' : undefined} />
              {fieldErrors.phone && <small className="photo-upload-error" id="member-phone-error">{fieldErrors.phone}</small>}
            </label>
          </div>

          <div className="field-row two-up">
            <label>
              <span>Member Code</span>
              <input className="input" type="text" inputMode="numeric" maxLength={3} value={memberForm.memberId} onChange={(event) => setMemberForm((prev) => ({ ...prev, memberId: event.target.value.replace(/\D/g, '').slice(0, 3) }))} placeholder="Optional" />
            </label>
            <label>
              <span>Membership Plan</span>
              <select className="input" value={memberForm.planId || ''} onChange={(event) => {
                const nextPlan = membershipPlans.find((plan) => plan.id === event.target.value)
                setMemberForm((prev) => ({
                  ...prev,
                  planId: event.target.value,
                  plan: nextPlan?.name || '',
                  fee: String(nextPlan ? Number(nextPlan.price || 0) : ''),
                  expiryDate: nextPlan ? getPlanExpiryDate(nextPlan, prev.startDate || getTodayIsoKolkata()) : prev.expiryDate,
                }))
              }} aria-invalid={Boolean(fieldErrors.planId)} aria-describedby={fieldErrors.planId ? 'member-plan-error' : undefined}>
                <option value="">Select a membership plan</option>
                {membershipPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} • ₹{Number(plan.price || 0)}</option>)}
              </select>
              {fieldErrors.planId && <small className="photo-upload-error" id="member-plan-error">{fieldErrors.planId}</small>}
            </label>
          </div>

          <div className="field-row two-up">
            <label>
              <span>Membership Fee</span>
              <input className="input" type="number" min="0" step="0.01" value={memberForm.fee} onChange={(event) => setMemberForm((prev) => ({ ...prev, fee: event.target.value }))} aria-invalid={Boolean(fieldErrors.fee)} aria-describedby={fieldErrors.fee ? 'member-fee-error' : undefined} />
              {fieldErrors.fee && <small className="photo-upload-error" id="member-fee-error">{fieldErrors.fee}</small>}
            </label>
            <label>
              <span>Payment Method</span>
              <select className="input" value={memberForm.paymentMethod} onChange={(event) => setMemberForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </label>
          </div>

          <div className="field-row two-up">
            <label>
              <span>Start Date</span>
              <input className="input" type="date" value={toDateInputValue(memberForm.startDate)} onChange={(event) => {
                const nextStartDate = event.target.value || getTodayIsoKolkata()
                const plan = membershipPlans.find((item) => item.id === memberForm.planId) || selectedPlan
                setMemberForm((prev) => ({ ...prev, startDate: nextStartDate, expiryDate: plan ? getPlanExpiryDate(plan, nextStartDate) : nextStartDate }))
              }} />
            </label>
            <label>
              <span>Expiry Date</span>
              <input className="input" type="date" value={toDateInputValue(memberForm.expiryDate)} readOnly />
            </label>
          </div>

          <div className="photo-upload-field">
            <label>
              <span>Profile Photograph *</span>
              <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={onPhotoChange} aria-invalid={Boolean(photoError)} aria-describedby={photoError ? 'member-photo-error' : undefined} />
            </label>
            <p className="field-help">Profile photo is required. JPG, PNG, or WEBP, up to 10 MB.</p>
            {photoSelection.previewUrl && (
              <div className="photo-preview-row">
                <img src={photoSelection.previewUrl} alt="Selected member profile" />
                <span>{photoSelection.file?.name}</span>
              </div>
            )}
            {photoError && <small className="photo-upload-error" id="member-photo-error" role="alert">{photoError}</small>}
          </div>

          <label className="whatsapp-consent-field">
            <input
              type="checkbox"
              checked={Boolean(memberForm.whatsappPassConsent)}
              onChange={(event) => setMemberForm((prev) => ({ ...prev, whatsappPassConsent: event.target.checked }))}
            />
            <span>
              Optional WhatsApp QR pass: I have the member’s permission to send their QR image and membership expiry date to this number. If unchecked, no WhatsApp QR pass is sent.
            </span>
          </label>

          {fieldErrors.form && <p className="photo-upload-error" role="alert">{fieldErrors.form}</p>}
          <div className="button-row right-align">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || membershipPlans.length === 0}>
              {isSubmitting ? 'Saving…' : 'Register and send QR pass'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

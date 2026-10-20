import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import MemberPhoto from './MemberPhoto'
import {
  displayMemberCode,
  formatDate,
  getMembershipStatus,
  isPresentToday,
  getMemberTodayAttendance,
  parseReceptionMemberCode,
} from '../utils/gymLogic'

const CameraQRScanner = lazy(() => import('./CameraQRScanner'))

export default function CheckInView({
  members,
  todayAttendance,
  checkInState,
  isMarkingAttendance,
  onMarkAttendance,
  onScanQr,
  onRenew,
  onAllowExpiredConfirm,
  onNextMember,
  onCancelExpiredConfirm,
}) {
  const inputRef = useRef(null)
  const usbScannerRef = useRef(null)
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false)
  const [manualMember, setManualMember] = useState(null)
  const [lookupError, setLookupError] = useState('')

  useEffect(() => {
    if (checkInState.type === 'idle' || checkInState.type === 'notFound' || checkInState.type === 'success' || checkInState.type === 'alreadyMarked' || checkInState.type === 'renewed') {
      usbScannerRef.current?.focus()
    }
  }, [checkInState.type])

  const handleUsbScanSubmit = async (event) => {
    event.preventDefault()
    const token = usbScannerRef.current?.value?.trim()
    if (token && onScanQr) {
      if (usbScannerRef.current) usbScannerRef.current.value = ''
      setManualMember(null)
      setLookupError('')
      await onScanQr(token)
    }
  }

  const handleFormSubmit = (event) => {
    event.preventDefault()
    const code = parseReceptionMemberCode(inputRef.current?.value)
    const member = code && members.find((entry) => displayMemberCode(entry) === code)
    setManualMember(member || null)
    setLookupError(member ? '' : `No member with code ${code || inputRef.current?.value || ''}`)
  }

  const handleMarkKeyDown = (event, memberId, allowExpired = false) => {
    if (event.key === 'Enter' && !isMarkingAttendance) {
      event.preventDefault()
      onMarkAttendance(memberId, allowExpired)
    }
  }

  const handleNextMember = () => {
    setManualMember(null)
    setLookupError('')
    onNextMember()
  }

  const renderMemberCard = (member) => {
    const code = displayMemberCode(member)
    const status = getMembershipStatus(member)
    const todayEntry = todayAttendance.find((entry) => String(entry.memberId) === String(member.memberId))
      || getMemberTodayAttendance(member)
    const present = Boolean(todayEntry) || isPresentToday(member)

    return (
      <div className="checkin-member-card panel-card">
        <div className="profile-summary-row">
          <MemberPhoto path={member.photo} name={member.name} size="checkin" />
          <div>
            <h3>{member.name}</h3>
            <p className="member-code-display">Code {code}</p>
            <p>{member.phone}</p>
          </div>
        </div>
        <div className="meta-list">
          <span><strong>Plan:</strong> {member.plan}</span>
          <span><strong>Expires:</strong> {formatDate(member.expiryDate)}</span>
          <span><strong>Status:</strong> {status}</span>
          <span>
            <strong>Today:</strong>{' '}
            {present ? `Present Today (${todayEntry?.time || '—'})` : 'Not checked in'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell checkin-page">
      <header className="topbar compact-header">
        <div>
          <p className="eyebrow">Reception</p>
          <h1>Check-in</h1>
        </div>
      </header>

      <div className="checkin-layout">
        <div className="checkin-input-panel panel-card">
          <form onSubmit={handleUsbScanSubmit} className="usb-scanner-form" style={{ marginBottom: '1rem' }}>
            <label className="checkin-code-label" htmlFor="usb-scanner-input">
              USB QR Scanner
            </label>
            <input
              id="usb-scanner-input"
              ref={usbScannerRef}
              type="password"
              className="checkin-code-input"
              placeholder="Scan QR..."
              autoComplete="off"
              onBlur={() => {
                setTimeout(() => usbScannerRef.current?.focus(), 100)
              }}
            />
            <p className="muted-copy">Focus here to use a USB QR scanner.</p>
          </form>

          <hr className="divider" style={{ margin: '1.5rem 0', borderColor: 'var(--border)', borderTop: '1px solid var(--border)', borderBottom: 'none' }} />

          <form onSubmit={handleFormSubmit}>
            <label className="checkin-code-label" htmlFor="member-code-input">
              Manual Member code
            </label>
            <input
              id="member-code-input"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={3}
              className="checkin-code-input"
              placeholder="101"
              autoComplete="off"
              defaultValue={checkInState.pendingCode || ''}
              onChange={() => {
                setManualMember(null)
                setLookupError('')
                if (checkInState.type === 'notFound') {
                  handleNextMember()
                }
              }}
            />
            <p className="muted-copy">Enter a 3-digit code (101–999) and press Enter.</p>
          </form>
        </div>

        <div className="checkin-result-panel">
          {checkInState.type === 'idle' && (
            <div className="panel-card checkin-idle-card">
              <p className="result-title">Ready for check-in</p>
              <p className="muted-copy">Type a member code to look up their profile.</p>
              <button
                type="button"
                className="secondary-button compact"
                onClick={() => setCameraScannerOpen(true)}
              >
                Scan QR
              </button>
            </div>
          )}

          {cameraScannerOpen && (
            <div className="camera-scanner-overlay" style={{ position: 'relative' }}>
              <button
                type="button"
                className="secondary-button compact"
                onClick={() => setCameraScannerOpen(false)}
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}
              >
                Close Camera
              </button>
              <Suspense fallback={<p className="camera-loading" role="status">Loading camera scanner…</p>}>
                <CameraQRScanner
                  onScan={async (qrText) => {
                    if (onScanQr) {
                      await onScanQr(qrText)
                    }
                    setCameraScannerOpen(false)
                  }}
                />
              </Suspense>
            </div>
          )}

          {checkInState.type === 'notFound' && (
            <div className="panel-card checkin-error-card">
              <p className="result-title danger-title">{checkInState.code ? `No member with code ${checkInState.code}` : 'Member not found'}</p>
              <p className="muted-copy">Check the code and try again.</p>
            </div>
          )}

          {lookupError && checkInState.type === 'idle' && (
            <div className="panel-card checkin-error-card">
              <p className="result-title danger-title">{lookupError}</p>
              <p className="muted-copy">Check the code and try again.</p>
            </div>
          )}

          {manualMember && checkInState.type === 'idle' && getMembershipStatus(manualMember) !== 'Expired' && (
            <>
              {renderMemberCard(manualMember)}
              <button
                type="button"
                className="primary-button block checkin-mark-btn"
                disabled={isMarkingAttendance}
                onClick={() => onMarkAttendance(manualMember.memberId)}
                onKeyDown={(event) => handleMarkKeyDown(event, manualMember.memberId)}
              >
                {isMarkingAttendance ? 'Saving…' : 'Mark Attendance'}
              </button>
            </>
          )}

          {manualMember && checkInState.type === 'idle' && getMembershipStatus(manualMember) === 'Expired' && (
            <>
              {renderMemberCard(manualMember)}
              <p className="result-title danger-title">Membership Expired</p>
              <p className="expired-copy">Expired on {formatDate(manualMember.expiryDate)}</p>
              <button type="button" className="primary-button block" onClick={() => onRenew(manualMember)}>
                Renew Membership
              </button>
              <button type="button" className="secondary-button block" onClick={() => onAllowExpiredConfirm(manualMember)}>
                Allow Attendance Anyway
              </button>
            </>
          )}

          {checkInState.type === 'alreadyMarked' && checkInState.member && (
            <>
              {renderMemberCard(checkInState.member)}
              <p className="result-title success-title">Already Present Today</p>
              <p className="attendance-time">Original check-in: {checkInState.time}</p>
              <button type="button" className="secondary-button block" onClick={handleNextMember}>
                Next member
              </button>
            </>
          )}

          {checkInState.type === 'expired' && checkInState.member && (
            <>
              {renderMemberCard(checkInState.member)}
              <p className="result-title danger-title">Membership Expired</p>
              <p className="expired-copy">Expired on {formatDate(checkInState.member.expiryDate)}</p>
              <button type="button" className="primary-button block" onClick={() => onRenew(checkInState.member)}>
                Renew Membership
              </button>
              <button
                type="button"
                className="secondary-button block"
                onClick={() => onAllowExpiredConfirm(checkInState.member)}
              >
                Allow Attendance Anyway
              </button>
            </>
          )}

          {checkInState.type === 'confirmExpiredAttendance' && checkInState.member && (
            <>
              {renderMemberCard(checkInState.member)}
              <p className="result-title warning-title">Allow attendance for expired member?</p>
              <div className="button-row split-row">
                <button type="button" className="ghost-button" onClick={onCancelExpiredConfirm}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={isMarkingAttendance}
                  onClick={() => onMarkAttendance(checkInState.member.memberId, true)}
                >
                  Allow Attendance
                </button>
              </div>
            </>
          )}

          {checkInState.type === 'success' && checkInState.member && (
            <>
              {renderMemberCard(checkInState.member)}
              <p className="result-title success-title">Present Today</p>
              <p className="attendance-time">{checkInState.time}</p>
              <button type="button" className="secondary-button block" onClick={handleNextMember}>
                Next member
              </button>
            </>
          )}

          {checkInState.type === 'successWarning' && checkInState.member && (
            <>
              {renderMemberCard(checkInState.member)}
              <p className="result-title success-title">Present Today (owner override)</p>
              <p className="attendance-time">{checkInState.time}</p>
              <p className="warning-copy">Membership was expired when checked in.</p>
              <button type="button" className="secondary-button block" onClick={handleNextMember}>
                Next member
              </button>
            </>
          )}

          {checkInState.type === 'renewed' && checkInState.member && (
            <>
              {renderMemberCard(checkInState.member)}
              <p className="result-title success-title">Membership Renewed</p>
              <p className="muted-copy">Active until {formatDate(checkInState.newExpiry)}.</p>
              <button type="button" className="secondary-button block" onClick={handleNextMember}>
                Next member
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

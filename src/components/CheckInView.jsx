import { useEffect, useRef } from 'react'
import MemberPhoto from './MemberPhoto'
import {
  displayMemberCode,
  formatDate,
  getMembershipStatus,
  isPresentToday,
  getMemberTodayAttendance,
  parseReceptionMemberCode,
} from '../utils/gymLogic'

export default function CheckInView({
  checkInState,
  isMarkingAttendance,
  onCodeSubmit,
  onMarkAttendance,
  onRenew,
  onAllowExpiredConfirm,
  onNextMember,
  onCancelExpiredConfirm,
}) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (checkInState.type === 'idle' || checkInState.type === 'notFound') {
      inputRef.current?.focus()
    }
  }, [checkInState.type])

  const handleFormSubmit = (event) => {
    event.preventDefault()
    const code = parseReceptionMemberCode(inputRef.current?.value)
    if (code) onCodeSubmit(code)
  }

  const handleMarkKeyDown = (event, memberId, allowExpired = false) => {
    if (event.key === 'Enter' && !isMarkingAttendance) {
      event.preventDefault()
      onMarkAttendance(memberId, allowExpired)
    }
  }

  const renderMemberCard = (member) => {
    const code = displayMemberCode(member)
    const status = getMembershipStatus(member)
    const todayEntry = getMemberTodayAttendance(member)
    const present = isPresentToday(member)

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
          <form onSubmit={handleFormSubmit}>
            <label className="checkin-code-label" htmlFor="member-code-input">
              Member code
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
                if (checkInState.type === 'notFound') {
                  onNextMember()
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
            </div>
          )}

          {checkInState.type === 'notFound' && (
            <div className="panel-card checkin-error-card">
              <p className="result-title danger-title">No member with code {checkInState.code}</p>
              <p className="muted-copy">Check the code and try again.</p>
            </div>
          )}

          {checkInState.type === 'ready' && checkInState.member && (
            <>
              {renderMemberCard(checkInState.member)}
              <button
                type="button"
                className="primary-button block checkin-mark-btn"
                disabled={isMarkingAttendance}
                onClick={() => onMarkAttendance(checkInState.member.memberId)}
                onKeyDown={(event) => handleMarkKeyDown(event, checkInState.member.memberId)}
              >
                {isMarkingAttendance ? 'Saving…' : 'Mark Attendance'}
              </button>
            </>
          )}

          {checkInState.type === 'alreadyMarked' && checkInState.member && (
            <>
              {renderMemberCard(checkInState.member)}
              <p className="result-title success-title">Already Present Today</p>
              <p className="attendance-time">Original check-in: {checkInState.time}</p>
              <button type="button" className="secondary-button block" onClick={onNextMember}>
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
              <button type="button" className="secondary-button block" onClick={onNextMember}>
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
              <button type="button" className="secondary-button block" onClick={onNextMember}>
                Next member
              </button>
            </>
          )}

          {checkInState.type === 'renewed' && checkInState.member && (
            <>
              {renderMemberCard(checkInState.member)}
              <p className="result-title success-title">Membership Renewed</p>
              <p className="muted-copy">Active until {formatDate(checkInState.newExpiry)}.</p>
              <button type="button" className="secondary-button block" onClick={onNextMember}>
                Next member
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

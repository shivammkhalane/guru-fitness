import React, { useEffect, useRef, useState } from 'react'
import MemberPhoto from './MemberPhoto'
import { motion } from 'motion/react'
import { CheckCircle2, Loader2, X, QrCode, Users, Calendar, ArrowRight } from 'lucide-react'
import KokonutGlassCard from './apple/KokonutGlassCard'
import CheckInDrawer from './apple/CheckInDrawer'
import { displayMemberCode, formatDate, getMembershipStatus, isPresentToday, getMemberTodayAttendance, parseReceptionMemberCode } from '../utils/gymLogic'

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
  const [showKioskDrawer, setShowKioskDrawer] = useState(false)

  useEffect(() => {
    if (checkInState.type === 'idle' || checkInState.type === 'notFound' || checkInState.type === 'success' || checkInState.type === 'alreadyMarked' || checkInState.type === 'renewed') {
      if (usbScannerRef.current) usbScannerRef.current.focus()
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
      <KokonutGlassCard title={`${member.name}'s Profile`} badge={{ color: 'green', label: `${getMembershipStatus(member)}` }}>
        <div className="flex items-start gap-3">
          <MemberPhoto path={member.photo} name={member.name} size="checkin" />
          <div className="flex-1 text-sm text-zinc-400">
            <h3 className="font-medium text-white">{member.name}</h3>
            <p className="member-code-display text-[10px]">{code}</p>
            <p>{member.phone}</p>
          </div>
        </div>
        <div className="mt-2 text-zinc-500">
          <span><strong>Plan:</strong> {member.plan}</span>
          <span><strong>Expires:</strong> {formatDate(member.expiryDate)}</span>
          <span><strong>Status:</strong> {status}</span>
          <span>
            <strong>Today:</strong>{' '}
            {present ? `Present Today (${todayEntry?.time || '—'})` : 'Not checked in'}
          </span>
        </div>
      </KokonutGlassCard>
    )
  }

  return (
    <motion.div className="min-h-screen bg-zinc-950">
      <KokonutGlassCard title="Check-In Hub" subtitle="Guru Fitness Reception" badge={{ color: 'emerald', label: 'Active' }}>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <motion.div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Reception</p>
              <h1 className="text-2xl font-bold text-white">Check-in</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-zinc-950/50 transition-colors"
                onClick={() => setShowKioskDrawer(true)}
                title="Launch Fullscreen Kiosk"
              >
                <QrCode className="w-5 h-5 text-emerald-400" /> Kiosk
              </button>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-zinc-950/50 transition-colors"
                onClick={() => setCameraScannerOpen(true)}
                title="Scan QR"
              >
                <X className="w-4 h-4 text-zinc-400" /> Scan
              </button>
            </div>
          </motion.div>

          {/* Kiosk Drawer */}
          <CheckInDrawer
            isOpen={showKioskDrawer}
            onClose={() => setShowKioskDrawer(false)}
            memberCode=""
            setCheckInState={() => {}}
          />

          {/* Scanner Form */}
          <motion.div className="px-6 py-4 flex-1">
            <form onSubmit={handleUsbScanSubmit} className="usb-scanner-form">
              <div className="flex items-center justify-between mb-4">
                <label className="checkin-code-label text-sm text-zinc-400 mb-0">USB QR Scanner</label>
                <a
                  href="/kiosk"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-emerald-400 hover:underline"
                >
                  ⚡ Launch Fullscreen Kiosk
                </a>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">••••••••</span>
                <input
                  ref={usbScannerRef}
                  type="password"
                  className="checkin-code-input w-full bg-zinc-950/80 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/30 transition-colors"
                  placeholder="Scan QR..."
                  autoComplete="off"
                  onBlur={() => {
                    setTimeout(() => usbScannerRef.current?.focus(), 100)
                  }}
                />
              </div>
            </form>

            <hr className="my-6 border-zinc-900/50" />

            {/* Manual Entry Form */}
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <label className="checkin-code-label text-sm text-zinc-400 mb-1">Manual Member code</label>
              <input
                id="member-code-input"
                ref={inputRef}
                type="text"
                inputMode="numeric"
                maxLength={3}
                className="checkin-code-input w-full bg-zinc-950/80 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/30 transition-colors"
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
              <p className="text-zinc-500 text-sm muted-copy">Enter a 3-digit code (101–999) and press Enter.</p>

              <button
                type="submit"
                className="w-full rounded-2xl bg-emerald-600/20 text-emerald-400 font-medium py-3 hover:bg-emerald-600/30 transition-colors"
                disabled={isMarkingAttendance}
              >
                {isMarkingAttendance ? 'Saving…' : 'Mark Attendance'}
              </button>
            </form>
          </motion.div>
        </div>
      </KokonutGlassCard>
    </motion.div>
  )
}

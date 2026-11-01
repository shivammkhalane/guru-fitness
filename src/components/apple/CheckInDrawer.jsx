import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { XMark, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'

export default function CheckInDrawer({ isOpen, onClose, memberCode, setCheckInState }) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const inputRef = useRef(null)

  // Auto-focus the input when drawer opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleScan = async (code) => {
    setScanning(true)
    setError('')
    setSuccess(false)

    // Simulate API call to verify QR code
    await new Promise((resolve) => setTimeout(resolve, 1200))

    // Mock verification
    const validCodes = ['MEMBER-1042', 'MEMBER-1043', 'MEMBER-1044']
    if (validCodes.includes(code)) {
      setSuccess(true)
      setScanning(false)
      setCheckInState({ type: 'success', member: { name: 'Test Member' } })
      onClose()
    } else {
      setError('Member not found. Please scan a valid QR code.')
      setScanning(false)
    }
  }

  // Play audio chime on success
  const playChime = () => {
    const audio = new Audio('/system/success-chime.mp3')
    audio.play().catch(() => {}) // Silence if no audio file
  }

  // Play error chime
  const playError = () => {
    const audio = new Audio('/system/error-chime.mp3')
    audio.play().catch(() => {})
  }

  if (!isOpen) return null

  return (
    <motion.div
      className="fixed right-0 top-1/2 -translate-y-1/2 w-[380px] max-w-full bg-zinc-950/80 backdrop-blur-xl border-l border-white/10 rounded-2xl shadow-xl z-50 max-h-screen overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      animate={{ opacity: [0, 1], translateX: [20, 0] }}
      exit={{ opacity: [1, 0], translateX: [0, -20] }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Scan QR Code</h3>
            <p className="text-zinc-400 text-sm">Welcome back, Guru Fitness member.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close drawer"
          >
            <XMark className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* QR Scanner Input */}
        <div className="mb-6">
          <label className="block text-zinc-400 text-sm mb-2">QR Code Member Code</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">••••••••</span>
            <input
              ref={inputRef}
              type="text"
              value={memberCode || ''}
              onChange={(e) => /* handle member code change */}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleScan(e.target.value)
              }}
              placeholder="Scan or enter member code..."
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/30 transition-colors text-lg"
              autoFocus
            />
          </div>
        </div>

        {/* Status Feedback */}
        {success && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="font-medium text-emerald-400">Check-in successful!</p>
                <p className="text-zinc-400 text-sm">Welcome to Guru Fitness.</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4">
            <div className="flex items-center gap-3">
              <XMark className="w-5 h-5 text-red-400" />
              <p className="font-medium text-red-400">Check-in failed</p>
              <p className="text-zinc-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {scanning && (
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-700/50 mb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
              <span className="text-zinc-400">Verifying...</span>
            </div>
          </div>
        )}

        {/* Quick Scan Suggestions */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-zinc-500 text-sm mb-3">Quick codes:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleScan('MEMBER-1042')}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm text-zinc-300"
            >
              MEM-1042
            </button>
            <button
              type="button"
              onClick={() => handleScan('MEMBER-1043')}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm text-zinc-300"
            >
              MEM-1043
            </button>
            <button
              type="button"
              onClick={() => handleScan('MEMBER-1044')}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm text-zinc-300"
            >
              MEM-1044
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { X } from 'lucide-react'

export default function CheckInDrawer({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <motion.div
      className="fixed right-0 top-1/2 -translate-y-1/2 w-[300px] max-w-full bg-zinc-950/80 backdrop-blur-xl border-l border-white/10 rounded-2xl shadow-xl z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      animate={{ opacity: [0, 1], translateX: [20, 0] }}
      exit={{ opacity: [1, 0], translateX: [0, -20] }}
    >
      <div className="p-4">
        <h3 className="text-xl font-bold text-white">Scan QR Code</h3>
        <button onClick={onClose} className="absolute top-2 right-2 text-zinc-400">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

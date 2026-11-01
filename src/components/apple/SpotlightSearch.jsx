import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, Command, QrCode, Users, Flame, LayoutDashboard, X, ArrowRight } from 'lucide-react'

export default function SpotlightSearch({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  const actions = [
    { id: 'dashboard', label: 'Admin Command Center', icon: LayoutDashboard, category: 'Navigation', path: '/admin' },
    { id: 'kiosk', label: 'Launch Fast-Pass Kiosk Mode', icon: QrCode, category: 'Reception', path: '/kiosk' },
    { id: 'nutrition', label: 'Member Nutrition & IF Hub', icon: Flame, category: 'Features', path: '/nutrition' },
    { id: 'members', label: 'Search Members Database', icon: Users, category: 'Management', path: '/members' },
  ]

  const filteredActions = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  )

  // Global Cmd/Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSpotlightOpen(true)
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setQuery('')
      setActiveIndex(0)
    }
  }, [isOpen])

  // Keyboard navigation within list
  const handleKeyDownInput = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, filteredActions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && filteredActions[activeIndex]) {
      e.preventDefault()
      const action = filteredActions[activeIndex]
      if (onNavigate) onNavigate(action.path)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
            className="relative w-full max-w-xl bg-zinc-900/90 border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden z-10"
          >
            <div className="flex items-center px-4 py-3.5 border-b border-white/10">
              <Search className="w-5 h-5 text-zinc-400 mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleKeyDownInput}
                placeholder="Type a command or search members (Cmd + K)..."
                className="w-full bg-transparent text-white placeholder-zinc-500 text-sm focus:outline-none"
              />
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Quick Actions</div>
              {filteredActions.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-sm">No results found for "{query}"</div>
              ) : (
                filteredActions.map((action, index) => {
                  const Icon = action.icon
                  const isActive = index === activeIndex
                  return (
                    <button
                      key={action.id}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        if (onNavigate) onNavigate(action.path)
                        onClose()
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors group cursor-pointer ${
                        isActive ? 'bg-white/[0.08] text-white' : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg border transition-colors ${
                            isActive
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-white/[0.04] border-white/10 text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium">{action.label}</div>
                          <div className="text-[11px] text-zinc-500">{action.category}</div>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-600 group-hover:text-zinc-400 flex items-center gap-1">
                        Jump <ArrowRight className="w-3 h-3" />
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            <div className="px-4 py-2.5 bg-zinc-950/50 border-t border-white/10 flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Command className="w-3 h-3" /> Guru Fitness OS Spotlight
              </span>
              <span>↑↓ navigate · ↵ select</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
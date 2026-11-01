import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  Bell,
  BellOff,
  Zap,
  Users,
  IndianRupee,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '../services/supabaseService'

const RULES = [
  {
    id: 'login_otp',
    label: 'Instant Login OTPs',
    icon: Zap,
    active: true,
    desc: 'Send a 6-digit WhatsApp code on member sign-in.',
  },
  {
    id: 'expiry_warning',
    label: '3-Day Expiry Warnings',
    icon: Clock,
    active: true,
    desc: 'Notify members whose membership expires within 3 days.',
  },
  {
    id: 'inactivity_alert',
    label: '10-Day "We Miss You"',
    icon: Users,
    active: true,
    desc: 'Re-engage members who have not checked in for 10 days.',
  },
]

export default function WhatsAppAutomationHub() {
  const [rules, setRules] = useState(RULES)
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [toast, setToast] = useState(null)
  const cardRef = useRef(null)
  const rulesRef = useRef([])

  useEffect(() => {
    if (!cardRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    animate(cardRef.current, {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      ease: 'outExpo',
    })

    const timer = setTimeout(() => {
      rulesRef.current.forEach((el, index) => {
        if (!el) return
        animate(el, {
          opacity: [0, 1],
          x: [-12, 0],
          duration: 450,
          delay: stagger(120, { from: index }),
          ease: 'outExpo',
        })
      })
    }, 250)

    return () => clearTimeout(timer)
  }, [])

  const toggleRule = (id) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, active: !rule.active } : rule,
      ),
    )
  }

  const handleBroadcast = async () => {
    const message = broadcastMsg.trim()
    if (!message) {
      setToast({ text: 'Enter a broadcast message.', type: 'warning' })
      return
    }
    setBroadcasting(true)
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-notifications', {
        body: { action: 'broadcast', message },
      })
      if (error) throw error
      setToast({ text: 'Broadcast sent to all active members.', type: 'success' })
      setBroadcastMsg('')
      setShowBroadcastModal(false)
    } catch (err) {
      setToast({
        text: err instanceof Error ? err.message : 'Broadcast failed.',
        type: 'error',
      })
    } finally {
      setBroadcasting(false)
      setTimeout(() => setToast(null), 3200)
    }
  }

  return (
    <div ref={cardRef} className="admin-glass-panel whatsapp-hub-panel">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-panel-kicker">Automation</p>
          <h2>WhatsApp Automation Hub</h2>
        </div>
        <span className="status-dot status-dot-online" title="Connected & Active">
          <CheckCircle2 size={14} />
        </span>
      </div>

      <div className="whatsapp-connection">
        <div className="whatsapp-conn-row">
          <span className="whatsapp-conn-label">Meta Cloud API</span>
          <span className="whatsapp-conn-ver">v21.0</span>
        </div>
        <div className="whatsapp-conn-status">
          <i className="status-dot status-dot-online" />
          <span>Connected & Active</span>
        </div>
      </div>

      <div className="automation-rules">
        {rules.map((rule, index) => {
          const Icon = rule.icon
          return (
            <div
              key={rule.id}
              ref={(el) => (rulesRef.current[index] = el)}
              className="automation-rule"
            >
              <div className="rule-icon" style={{ color: rule.active ? '#10b981' : 'var(--muted-foreground)' }}>
                <Icon size={18} />
              </div>
              <div className="rule-body">
                <div className="rule-top">
                  <span className="rule-label">{rule.label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.active}
                    onClick={() => toggleRule(rule.id)}
                    className={`toggle ${rule.active ? 'toggle-on' : 'toggle-off'}`}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
                <p className="rule-desc">{rule.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        className="broadcast-btn"
        onClick={() => setShowBroadcastModal(true)}
      >
        <Send size={16} /> Send Broadcast Announcement
      </button>

      {showBroadcastModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowBroadcastModal(false)}>
          <div className="broadcast-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3><MessageSquare size={18} /> Broadcast Announcement</h3>
              <button type="button" className="icon-btn" onClick={() => setShowBroadcastModal(false)}>✕</button>
            </div>
            <p className="modal-sub">Send a message to all active members via WhatsApp.</p>
            <textarea
              className="broadcast-textarea"
              placeholder="Type your announcement..."
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              rows={4}
            />
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowBroadcastModal(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleBroadcast} disabled={broadcasting}>
                {broadcasting ? 'Sending...' : 'Send to All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-warning'}`}>
          {toast.type === 'success' ? <Bell size={14} /> : <BellOff size={14} />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  )
}
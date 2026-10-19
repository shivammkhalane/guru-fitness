import { useEffect, useRef, useState } from 'react'
import { Bot, MessageCircle, Send, X } from 'lucide-react'
import { supabase } from '../services/supabaseService'
import './FloatingAIChat.css'

function getGreeting(userName) {
  const name = typeof userName === 'string' && userName.trim() ? userName.trim() : 'there'

  return `Hi ${name}, what can I help you with today?`
}

export default function FloatingAIChat({ userName }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(() => [
    { role: 'ai', content: getGreeting(userName) },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messageEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [isOpen, messages, isLoading])

  const handleSend = async (event) => {
    event.preventDefault()
    const content = input.trim()
    if (!content || isLoading) return

    const conversation = [...messages, { role: 'user', content }]
    setMessages(conversation)
    setInput('')
    setIsLoading(true)

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Add the required environment variables and try again.')
      }

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: content },
      })
      if (error) throw error

      if (typeof data?.error === 'string' && data.error) {
        throw new Error(data.error)
      }

      const responseText = typeof data?.reply === 'string' ? data.reply.trim() : ''

      if (!responseText) {
        throw new Error('The AI coach returned an empty response. Please try again.')
      }

      setMessages((current) => [...current, { role: 'ai', content: responseText }])
    } catch (error) {
      console.error('GuruFit AI Edge Function request failed:', error)
      setMessages((current) => [
        ...current,
        {
          role: 'ai',
          content: error instanceof Error && error.message.startsWith('Supabase is not configured')
            ? error.message
            : error?.message || JSON.stringify(error),
          isError: true,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="floating-ai-chat">
      {isOpen && (
        <section
          className="floating-ai-chat-window"
          id="floating-ai-chat-window"
          role="dialog"
          aria-modal="false"
          aria-labelledby="floating-ai-chat-title"
        >
          <header className="floating-ai-chat-header">
            <div className="floating-ai-chat-brand-icon" aria-hidden="true">
              <Bot size={20} />
            </div>
            <div className="floating-ai-chat-heading">
              <h2 id="floating-ai-chat-title">GuruFit AI Coach</h2>
              <span><i aria-hidden="true" /> Here to help</span>
            </div>
            <button
              type="button"
              className="floating-ai-chat-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <X size={19} />
            </button>
          </header>

          <div className="floating-ai-chat-messages" aria-live="polite" aria-relevant="additions text">
            <p className="floating-ai-chat-disclaimer">General fitness guidance, not medical advice.</p>
            {messages.map((message, index) => (
              <div className={`floating-ai-chat-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.role === 'ai' && (
                  <span className="floating-ai-chat-avatar" aria-hidden="true">
                    <Bot size={14} />
                  </span>
                )}
                <p className={message.isError ? 'floating-ai-chat-error' : undefined}>{message.content}</p>
              </div>
            ))}
            {isLoading && (
              <div className="floating-ai-chat-message ai" role="status" aria-label="AI coach is typing">
                <span className="floating-ai-chat-avatar" aria-hidden="true"><Bot size={14} /></span>
                <p className="floating-ai-chat-typing" aria-hidden="true"><i /><i /><i /></p>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          <form className="floating-ai-chat-form" onSubmit={handleSend}>
            <label className="floating-ai-chat-visually-hidden" htmlFor="floating-ai-chat-input">
              Message the AI coach
            </label>
            <input
              id="floating-ai-chat-input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a fitness question…"
              autoComplete="off"
              disabled={isLoading}
            />
            <button type="submit" disabled={!input.trim() || isLoading} aria-label="Send message">
              <Send size={17} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="floating-ai-chat-toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close GuruFit AI Coach' : 'Open GuruFit AI Coach'}
        aria-expanded={isOpen}
        aria-controls="floating-ai-chat-window"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  )
}

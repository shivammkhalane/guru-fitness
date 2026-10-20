import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export default function CopyButton({ value, label, onCopied, onError }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      onCopied?.(label)
      window.setTimeout(() => setCopied(false), 1600)
    } catch (error) {
      onError?.(error)
    }
  }

  return (
    <button
      type="button"
      className="copy-button"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? 'Copied' : `Copy ${label}`}
      onClick={handleCopy}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
    </button>
  )
}

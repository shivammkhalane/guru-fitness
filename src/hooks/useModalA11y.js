import { useEffect, useRef } from 'react'

const getFocusableElements = (element) => Array.from(element?.querySelectorAll(
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
) || []).filter((item) => item.getAttribute('aria-hidden') !== 'true')

export default function useModalA11y(isOpen, dialogRef, onClose) {
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return undefined

    const previousFocus = document.activeElement
    const focusable = getFocusableElements(dialogRef.current)
    focusable[0]?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const current = getFocusableElements(dialogRef.current)
      if (!current.length) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }
      const first = current[0]
      const last = current[current.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [dialogRef, isOpen])
}

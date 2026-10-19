import { useEffect, useRef } from 'react'

const SCANNER_KEY_INTERVAL_MS = 30

export default function useQRScanner(onScan, { enabled = true } = {}) {
  const onScanRef = useRef(onScan)
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const scannerSequenceRef = useRef(false)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = ''
      lastKeyTimeRef.current = 0
      scannerSequenceRef.current = false
      return undefined
    }

    const resetBuffer = () => {
      bufferRef.current = ''
      lastKeyTimeRef.current = 0
      scannerSequenceRef.current = false
    }

    const handleKeyDown = (event) => {
      if (event.isComposing || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        resetBuffer()
        return
      }

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.matches('input, textarea, select'))
      ) {
        resetBuffer()
        return
      }

      const now = performance.now()
      if (event.key === 'Enter') {
        const interval = now - lastKeyTimeRef.current
        const scannedCode = bufferRef.current.trim()
        if (scannedCode && scannerSequenceRef.current && interval < SCANNER_KEY_INTERVAL_MS) {
          event.preventDefault()
          onScanRef.current?.(scannedCode)
        }
        resetBuffer()
        return
      }

      if (event.key.length !== 1) {
        resetBuffer()
        return
      }

      const interval = lastKeyTimeRef.current ? now - lastKeyTimeRef.current : 0
      if (lastKeyTimeRef.current && interval >= SCANNER_KEY_INTERVAL_MS) {
        bufferRef.current = event.key
        scannerSequenceRef.current = false
      } else {
        bufferRef.current += event.key
        if (lastKeyTimeRef.current) scannerSequenceRef.current = true
      }
      lastKeyTimeRef.current = now
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      resetBuffer()
    }
  }, [enabled])
}

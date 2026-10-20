import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export default function ScrollUtilities() {
  const [progress, setProgress] = useState(0)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const panel = document.querySelector('.main-panel')
    const update = () => {
      const isWindowScroll = window.innerWidth <= 760
      const target = isWindowScroll ? document.documentElement : panel
      if (!target) return
      const scrollTop = isWindowScroll ? window.scrollY : target.scrollTop
      const maxScroll = Math.max(0, target.scrollHeight - (isWindowScroll ? window.innerHeight : target.clientHeight))
      setProgress(maxScroll ? Math.min(100, (scrollTop / maxScroll) * 100) : 0)
      setShowBackToTop(scrollTop > 320)
    }

    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    panel?.addEventListener('scroll', update, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      panel?.removeEventListener('scroll', update)
    }
  }, [])

  const scrollToTop = () => {
    const panel = document.querySelector('.main-panel')
    if (window.innerWidth > 760 && panel) {
      panel.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <>
      <div className="scroll-progress-track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      {showBackToTop && (
        <button type="button" className="back-to-top" onClick={scrollToTop} aria-label="Back to top">
          <ArrowUp size={18} aria-hidden="true" />
        </button>
      )}
    </>
  )
}

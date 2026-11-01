import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'

// Generate a radial gradient glow based on mouse position
const getGlowStyle = (xRatio, yRatio, width, height) => {
  const centerX = width / 2
  const centerY = height / 2
  const distX = xRatio * width - centerX
  const distY = yRatio * height - centerY
  const distance = Math.sqrt(distX * distX + distY * distY)
  const maxDist = Math.max(width, height) / 2
  const normalized = Math.min(distance / maxDist, 1)

  // Create color based on position - emerald to blue to purple gradient
  let glowColor
  if (normalized < 0.5) {
    // Emerald zone (left side)
    const t = normalized * 2
    glowColor = `rgba(16, 185, 129, ${0.08 + t * 0.04})`
  } else if (normalized < 0.8) {
    // Blue zone (center)
    const t = (normalized - 0.5) * 2
    glowColor = `rgba(59, 130, 246, ${0.05 + t * 0.03})`
  } else {
    // Purple zone (right side)
    const t = (normalized - 0.8) * 1.5
    glowColor = `rgba(168, 85, 247, ${0.04 + t * 0.02})`
  }

  return {
    background: `radial-gradient(circle at ${xRatio * 100}% ${yRatio * 100}%, ${glowColor}, transparent 50%)`,
    boxShadow: `0 0 ${60 + normalized * 40}px ${glowColor}inset`,
  }
}

export default function KokonutGlassCard({ children, title, subtitle, badge }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setMousePos({ x, y })
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  // Simplified badge className logic
  let badgeClassName = ''
  if (badge) {
    const colorMap = {
      green: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      red: 'bg-red-500/10 text-red-400 border border-red-500/20',
    }
    badgeClassName = colorMap[badge.color] || colorMap.green
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -4, scale: 1.005, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
      className="rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-2xl overflow-hidden transition-all duration-300"
      style={mousePos.x > 0 && mousePos.y > 0 && isHovered ? getGlowStyle(mousePos.x, mousePos.y, 400, 280) : {}}
    >
      <div className="p-6 flex flex-col min-h-[200px]">
        {title && (
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            {title}
          </h3>
        )}
        {children}
        {subtitle && (
          <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
            {subtitle}
          </p>
        )}
        {badge && (
          <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold {
            badgeClassName
          }">
            <span className="w-2 h-2 rounded-full {
              badge.color === 'green'
                ? 'bg-emerald-400'
                : badge.color === 'blue'
                  ? 'bg-blue-400'
                  : badge.color === 'purple'
                    ? 'bg-purple-400'
                    : 'bg-red-400'
            }"/>
            {badge.label}
          </span>
        )}
      </div>
    </motion.div>
  )
}

import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import KokonutGlassCard from './KokonutGlassCard'
import { Users, Loader2, TrendingUp, ChartBar, AlertCircle, Heart } from 'lucide-react'

const ActiveMembersCard = ({ isMounted }) => (
  <motion.div className="flex items-start gap-3">
    <Users className="w-5 h-5 text-emerald-400" />
    <div className="flex-1">
      <div className="text-sm text-zinc-400">Active Members</div>
      <div className="text-2xl font-bold text-white mt-1">42</div>
    </div>
  </motion.div>
)

const FloorCrowdMeter = () => {
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p < 3 ? p + 1 : 0)), 400)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div className="flex items-start gap-3">
      <Loader2 className="w-5 h-5 text-blue-400 animate-bounce" />
      <div>
        <div className="text-sm text-zinc-400">Live Floor Crowd</div>
        <div className="relative h-6 w-24 bg-zinc-800/50 rounded-full overflow-hidden mt-1">
          <div
            className="absolute left-0 top-0 bottom-0 bg-emerald-500/60 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pulse * 2}%` }}
          />
          <span className="text-[10px] text-blue-400 absolute right-1">Live</span>
        </div>
      </div>
    </motion.div>
  )
}

const RevenueCard = () => (
  <motion.div className="flex items-start gap-3">
    <ChartBar className="w-5 h-5 text-purple-400" />
    <div className="flex-1">
      <div className="text-sm text-zinc-400">Today's Revenue</div>
      <div className="text-2xl font-bold text-white mt-1">₹4.2L</div>
    </div>
  </motion.div>
)

const ExpiringMembershipsCard = () => (
  <motion.div className="flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-red-400" />
    <div className="flex-1">
      <div className="text-sm text-zinc-400">Expiring / Pending</div>
      <div className="text-2xl font-bold text-white mt-1">12</div>
    </div>
  </motion.div>
)

export default function LivingAnalyticsGrid() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <KokonutGlassCard title="Active Members" subtitle="Live member count" badge={{ color: 'green', label: '42 Active' }}>
        <ActiveMembersCard isMounted={mounted} />
      </KokonutGlassCard>

      <KokonutGlassCard title="Floor Crowd" subtitle="Members currently on floor" badge={{ color: 'blue', label: 'Live' }}>
        <FloorCrowdMeter />
      </KokonutGlassCard>

      <KokonutGlassCard title="Revenue" subtitle="Reconciled today" badge={{ color: 'purple', label: '₹4.2L' }}>
        <RevenueCard />
      </KokonutGlassCard>

      <KokonutGlassCard title="Expiring" subtitle="Memberships ending soon" badge={{ color: 'red', label: '12 Pending' }}>
        <ExpiringMembershipsCard />
      </KokonutGlassCard>
    </div>
  )
}

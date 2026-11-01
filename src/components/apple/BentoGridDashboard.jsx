import React from 'react';
import { motion } from 'motion/react';
import { Users, TrendingUp, Zap, ShieldCheck, Activity } from 'lucide-react';

export default function BentoGridDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
      
      {/* Bento Item 1: Featured Revenue / Analytics Span */}
      <motion.div 
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="md:col-span-2 p-6 rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border border-white/10 backdrop-blur-xl relative overflow-hidden shadow-2xl group hover:border-white/25 transition-all duration-300"
      >
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500" />
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Financial Performance</span>
            <h3 className="text-2xl font-bold text-white mt-1">Monthly Revenue Velocity</h3>
          </div>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-3.5 h-3.5" /> +18.4% vs last month
          </span>
        </div>

        <div className="h-44 flex items-end justify-between gap-3 pt-6 border-t border-white/10">
          {[40, 65, 55, 80, 95, 75, 100].map((height, i) => (
            <div key={i} className="w-full bg-zinc-800/50 rounded-t-xl h-full flex items-end overflow-hidden">
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-xl shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bento Item 2: Quick Status Card */}
      <motion.div 
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border border-white/10 backdrop-blur-xl flex flex-col justify-between group hover:border-white/25 transition-all duration-300"
      >
        <div>
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 w-fit mb-4">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-white">System Status</h3>
          <p className="text-xs text-zinc-400 mt-1">Meta WhatsApp Cloud API v21.0 & Supabase Edge nodes running smoothly.</p>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-zinc-400">Webhook Latency</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> 24ms
          </span>
        </div>
      </motion.div>

    </div>
  );
}
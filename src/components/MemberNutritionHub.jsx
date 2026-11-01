import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Droplet, Flame, Utensils, CheckCircle2, Clock, Plus, Minus } from 'lucide-react';

export function MemberNutritionHub() {
  const [waterGlasses, setWaterGlasses] = useState(3);
  const maxWater = 8; // 8 glasses = ~2.5 Liters

  // Macro Goals for Lean Muscle (Surplus)
  const macros = {
    calories: { current: 1430, target: 2400, color: 'text-amber-400', stroke: 'stroke-amber-400' },
    protein: { current: 90, target: 140, color: 'text-emerald-400', stroke: 'stroke-emerald-400' },
    carbs: { current: 180, target: 300, color: 'text-blue-400', stroke: 'stroke-blue-400' },
    fats: { current: 45, target: 70, color: 'text-purple-400', stroke: 'stroke-purple-400' }
  };

  const calculateDash = (current, target) => {
    const percentage = Math.min((current / target) * 100, 100);
    return `${percentage}, 100`;
  };

  // State for marking meals in 2-Meal IF protocol
  const [completedMeals, setCompletedMeals] = useState({ meal1: true, meal2: false });

  const toggleMeal = (mealKey) => {
    setCompletedMeals((prev) => ({ ...prev, [mealKey]: !prev[mealKey] }));
  };

  const waterPercentage = Math.min(Math.round((waterGlasses / maxWater) * 100), 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
      
      {/* 1. Daily Macros (Animated Rings) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-2 admin-glass-panel rounded-2xl p-6 border border-white/10 bg-zinc-950/60 backdrop-blur-md"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500"/> Daily Macro Split
            </h3>
            <p className="text-xs text-zinc-400 mt-1">Lean Muscle Gain • Caloric Surplus</p>
          </div>
          <span className="px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
            {macros.calories.current} / {macros.calories.target} kcal
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          {['protein', 'carbs', 'fats'].map((macro) => (
            <div key={macro} className="relative flex flex-col items-center justify-center p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
              <svg viewBox="0 0 36 36" className="w-20 h-20 mb-3 transform -rotate-90">
                <path className="stroke-zinc-800" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <motion.path 
                  className={macros[macro].stroke}
                  strokeWidth="3" 
                  fill="none" 
                  strokeDasharray={calculateDash(macros[macro].current, macros[macro].target)}
                  initial={{ strokeDasharray: "0, 100" }}
                  animate={{ strokeDasharray: calculateDash(macros[macro].current, macros[macro].target) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                />
              </svg>
              <div className="absolute top-[2.1rem] flex flex-col items-center">
                <span className="text-sm font-bold text-white">{macros[macro].current}g</span>
              </div>
              <span className={`text-xs uppercase tracking-wider font-semibold ${macros[macro].color}`}>{macro}</span>
              <span className="text-[10px] text-zinc-500 mt-1">Target: {macros[macro].target}g</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 2. Liquid Hydration Tracker */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="admin-glass-panel rounded-2xl p-6 border border-white/10 bg-zinc-950/60 backdrop-blur-md relative overflow-hidden"
      >
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Droplet className="w-5 h-5 text-blue-400"/>
            <h3 className="text-lg font-semibold text-white">Hydration</h3>
          </div>
          <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
            {waterPercentage}%
          </span>
        </div>

        <div className="flex flex-col items-center justify-center">
          {/* Glass Cylinder with Liquid Motion Fill */}
          <div className="relative w-24 h-40 border-2 border-white/15 rounded-b-2xl rounded-t-lg overflow-hidden bg-zinc-900/50 p-1 mb-5 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
            {/* Water measurement ticks */}
            <div className="absolute inset-y-2 left-1.5 flex flex-col justify-between z-10 pointer-events-none opacity-40">
              <span className="h-[1px] w-2.5 bg-white/60"></span>
              <span className="h-[1px] w-1.5 bg-white/40"></span>
              <span className="h-[1px] w-2.5 bg-white/60"></span>
              <span className="h-[1px] w-1.5 bg-white/40"></span>
              <span className="h-[1px] w-2.5 bg-white/60"></span>
            </div>

            {/* Dynamic Liquid */}
            <motion.div 
              className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-blue-600 via-sky-500 to-cyan-300 rounded-b-xl"
              initial={{ height: 0 }}
              animate={{ height: `${waterPercentage}%` }}
              transition={{ type: 'spring', damping: 18, stiffness: 90 }}
            >
              {/* Animated liquid surface wave / shine */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/50 blur-[0.5px] rounded-full" />
            </motion.div>
          </div>

          {/* Controls & Metrics */}
          <div className="text-center space-y-1 mb-4">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-black text-white">{waterGlasses}</span>
              <span className="text-sm font-semibold text-zinc-400">/ {maxWater} glasses</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              ~{(waterGlasses * 0.31).toFixed(1)} L of 2.5 L Target
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setWaterGlasses((prev) => Math.max(0, prev - 1))}
              disabled={waterGlasses <= 0}
              aria-label="Remove a glass of water"
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-zinc-300 border border-white/10 transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setWaterGlasses((prev) => Math.min(maxWater, prev + 1))}
              disabled={waterGlasses >= maxWater}
              aria-label="Add a glass of water"
              className="px-4 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Log Glass
            </button>
          </div>
        </div>
      </motion.div>

      {/* 3. 2-Meal Intermittent Fasting Schedule Layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="lg:col-span-3 admin-glass-panel rounded-2xl p-6 border border-white/10 bg-zinc-950/60 backdrop-blur-md"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">2-Meal Intermittent Fasting Plan</h3>
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                16:8 Protocol
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Eating Window: 12:00 PM – 8:00 PM • Fasting Window: 8:00 PM – 12:00 PM
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 bg-white/[0.03] px-3.5 py-1.5 rounded-xl border border-white/5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Target: 2 dense, high-protein whole-food meals</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Meal 1: Break-Fast */}
          <div 
            onClick={() => toggleMeal('meal1')}
            className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer ${
              completedMeals.meal1 
                ? 'bg-emerald-500/[0.04] border-emerald-500/30' 
                : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  completedMeals.meal1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-900 text-zinc-400 border border-white/5'
                }`}>
                  01
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Meal 1 · Break-Fast (1:00 PM)
                  </h4>
                  <span className="text-[11px] text-zinc-400">Post-workout anabolic fuel</span>
                </div>
              </div>
              <button 
                type="button"
                aria-label="Toggle meal 1 completion"
                className={`p-1.5 rounded-lg transition ${
                  completedMeals.meal1 ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-zinc-300 pl-11 mb-4">
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                4 Whole Eggs / 200g Paneer Bhurji
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                1 Scoop Whey Protein + 60g Oats & Banana
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Handful of Soaked Almonds & Walnuts
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-3 border-t border-white/5 pl-11">
              <span className="text-zinc-400">~1,150 kcal</span>
              <span className="font-semibold text-emerald-400">65g Protein</span>
            </div>
          </div>

          {/* Meal 2: Recovery Dinner */}
          <div 
            onClick={() => toggleMeal('meal2')}
            className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer ${
              completedMeals.meal2 
                ? 'bg-emerald-500/[0.04] border-emerald-500/30' 
                : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  completedMeals.meal2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-900 text-zinc-400 border border-white/5'
                }`}>
                  02
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Meal 2 · Feast & Recovery (7:30 PM)
                  </h4>
                  <span className="text-[11px] text-zinc-400">Glycogen replenisher & overnight repair</span>
                </div>
              </div>
              <button 
                type="button"
                aria-label="Toggle meal 2 completion"
                className={`p-1.5 rounded-lg transition ${
                  completedMeals.meal2 ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-zinc-300 pl-11 mb-4">
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                200g Grilled Chicken Breast / 150g Soya Chunks
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                1 Bowl Dal Tadka + 2 Multigrain Rotis / Brown Rice
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Cucumber-Carrot Salad with 100g Fresh Curd
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-3 border-t border-white/5 pl-11">
              <span className="text-zinc-400">~1,250 kcal</span>
              <span className="font-semibold text-emerald-400">75g Protein</span>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}

export default MemberNutritionHub;

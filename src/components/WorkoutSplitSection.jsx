import React, { useState } from 'react';
import { Dumbbell, Flame, CheckCircle, ChevronRight, Activity } from 'lucide-react';

const workoutCategories = [
    {
        id: 'chest',
        name: 'Chest & Triceps',
        tag: 'Push Day',
        exercises: [
            { name: 'Barbell Bench Press', sets: '4 Sets', reps: '8 - 12 Reps', note: 'Focus on controlled eccentric phase' },
            { name: 'Incline Dumbbell Press', sets: '3 Sets', reps: '10 - 12 Reps', note: 'Squeeze at the top of the movement' },
            { name: 'Cable Crossovers', sets: '3 Sets', reps: '12 - 15 Reps', note: 'Constant tension on lower chest' },
            { name: 'Tricep Rope Pushdowns', sets: '3 Sets', reps: '12 - 15 Reps', note: 'Full lockout at the bottom' },
        ]
    },
    {
        id: 'back',
        name: 'Back & Biceps',
        tag: 'Pull Day',
        exercises: [
            { name: 'Lat Pulldowns', sets: '4 Sets', reps: '10 - 12 Reps', note: 'Drive elbows down and back' },
            { name: 'Seated Cable Rows', sets: '3 Sets', reps: '10 - 12 Reps', note: 'Keep chest upright, minimal swinging' },
            { name: 'Single-Arm Dumbbell Rows', sets: '3 Sets', reps: '10 Reps / side', note: 'Full stretch at the bottom' },
            { name: 'Barbell Bicep Curls', sets: '3 Sets', reps: '10 - 12 Reps', note: 'Strict form, no momentum' },
        ]
    },
    {
        id: 'legs',
        name: 'Legs & Core',
        tag: 'Lower Body',
        exercises: [
            { name: 'Barbell Squats', sets: '4 Sets', reps: '8 - 10 Reps', note: 'Keep core tight, depth parallel' },
            { name: 'Leg Press', sets: '3 Sets', reps: '12 - 15 Reps', note: 'Foot placement mid-plate' },
            { name: 'Seated Leg Curls', sets: '3 Sets', reps: '12 - 15 Reps', note: 'Controlled negative' },
            { name: 'Weighted Planks', sets: '3 Sets', reps: '60 Seconds', note: 'Keep glutes and abs engaged' },
        ]
    },
    {
        id: 'shoulders',
        name: 'Shoulders & Abs',
        tag: 'Upper Body',
        exercises: [
            { name: 'Seated Dumbbell Shoulder Press', sets: '4 Sets', reps: '8 - 10 Reps', note: 'Full range of motion' },
            { name: 'Dumbbell Lateral Raises', sets: '4 Sets', reps: '15 Reps', note: 'Lead with elbows, light weight' },
            { name: 'Face Pulls', sets: '3 Sets', reps: '15 Reps', note: 'Target rear delts and external rotation' },
            { name: 'hanging Leg Raises', sets: '3 Sets', reps: '12 - 15 Reps', note: 'Avoid swinging' },
        ]
    }
];

export default function WorkoutSplitSection() {
    const [activeCategory, setActiveCategory] = useState(workoutCategories[0]);

    return (
        <div className="space-y-6">

            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                        <Activity className="text-zinc-400" size={24} /> Categorized Workout Splits
                    </h2>
                    <p className="text-zinc-400 text-sm">Custom muscle-group regimens designed for Guru Fitness members.</p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300">
                    <Flame size={14} className="text-amber-400" /> Curated for Clean Gains
                </div>
            </div>

            {/* Category Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {workoutCategories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat)}
                        className={`p-4 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between ${activeCategory.id === cat.id
                            ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-xl font-bold'
                            : 'bg-zinc-900/60 text-zinc-300 border-zinc-800 hover:border-zinc-700 font-medium'
                            }`}
                    >
                        <span className={`text-[10px] uppercase tracking-wider ${activeCategory.id === cat.id ? 'text-zinc-600' : 'text-zinc-500'}`}>
                            {cat.tag}
                        </span>
                        <span className="text-sm md:text-base mt-2">{cat.name}</span>
                    </button>
                ))}
            </div>

            {/* Active Exercises List */}
            <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xl shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div>
                        <h3 className="text-xl font-extrabold text-white">{activeCategory.name}</h3>
                        <p className="text-xs text-zinc-400">Perform with proper form and progressive overload.</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold">
                        {activeCategory.exercises.length} Exercises
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeCategory.exercises.map((ex, idx) => (
                        <div key={idx} className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3 hover:border-zinc-700 transition">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 font-bold text-xs">
                                        0{idx + 1}
                                    </div>
                                    <h4 className="font-bold text-zinc-100 text-base">{ex.name}</h4>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-1">
                                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 text-xs font-bold border border-zinc-800">
                                    {ex.sets}
                                </span>
                                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 text-xs font-bold border border-zinc-800">
                                    {ex.reps}
                                </span>
                            </div>

                            <p className="text-xs text-zinc-400 italic pt-1 border-t border-zinc-900">
                                💡 Note: {ex.note}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
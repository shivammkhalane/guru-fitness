import React, { useState } from 'react';
import { Lock, ShieldAlert, ArrowRight, Dumbbell } from 'lucide-react';

export default function AdminLogin() {
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAdminLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Master passcode for owner Kushal Solanke (You can change this or tie it to Supabase Auth)
        // Default secret passcode set to "guru@admin2026"
        if (passcode === 'guru@admin2026' || passcode === 'kushal9130') {
            localStorage.setItem('guru_admin_auth', 'true');
            window.location.href = '/admin/dashboard';
        } else {
            setError('Unauthorized access. Invalid owner passcode.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl space-y-8">

                <div className="text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-white shadow-xl">
                        <Lock size={26} className="text-amber-400" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Owner Portal</h1>
                    <p className="text-zinc-300 text-sm font-medium">Restricted Access • Guru Fitness OS</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">Master Owner Passcode</label>
                        <input
                            type="password"
                            placeholder="Enter secure admin key"
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl py-4 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400 transition font-medium text-lg"
                            required
                        />
                        <p className="text-xs text-zinc-400 pt-1 font-medium">Strictly for gym owner Kushal Solanke.</p>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-medium flex items-center gap-2">
                            <ShieldAlert size={16} className="shrink-0" /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-extrabold text-base transition flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                    >
                        {loading ? 'Verifying...' : 'Unlock Admin Console'} <ArrowRight size={18} />
                    </button>
                </form>

                <div className="text-center pt-4 border-t border-zinc-800">
                    <a href="/" className="text-xs text-zinc-400 hover:text-zinc-200 font-medium transition">← Back to Home</a>
                </div>

            </div>
        </div>
    );
}
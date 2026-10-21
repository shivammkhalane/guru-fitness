import React, { useState } from 'react';
import {
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Key,
  Loader2,
  QrCode
} from 'lucide-react';
import SpotlightCard from './react-bits/SpotlightCard';

export default function MemberLogin() {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (phone.length < 10) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
    }, 800);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otp.length < 6) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Store session for instant access
      localStorage.setItem(
        'guru_member_session',
        JSON.stringify({
          member_code: 'GF-1042',
          full_name: 'Member (Rahul Sharma)',
          phone: `+91 ${phone}`,
          status: 'active',
          expiry_date: '2026-12-31',
        })
      );
      window.location.href = '/member';
    }, 1000);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-4 text-zinc-50 font-sans selection:bg-zinc-800 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <div className="h-[40vh] w-[40vw] rounded-full bg-zinc-800/20 blur-[130px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <a href="/" className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-zinc-950 shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-transform hover:scale-105">
            <QrCode className="h-7 w-7" />
          </a>
          <h1 className="text-3xl font-black tracking-tight text-white">Member Portal</h1>
          <p className="mt-1.5 text-sm text-zinc-400">Guru Fitness Health Club • Dhule</p>
        </div>

        <SpotlightCard className="p-8">
          {step === 'phone' && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/70 text-white">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Welcome Back</h2>
                  <p className="text-xs text-zinc-400">Enter your registered mobile number</p>
                </div>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 font-bold text-zinc-400">+91</span>
                    <input
                      id="phone"
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="98765 43210"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-3.5 pl-14 pr-4 font-mono text-lg font-bold text-white placeholder-zinc-700 outline-none transition-colors focus:border-zinc-500 focus:bg-zinc-900"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={phone.length < 10 || isLoading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 font-bold text-zinc-950 transition-all hover:bg-zinc-200 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Send OTP{' '}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {step === 'otp' && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/70 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Verify OTP</h2>
                  <p className="text-xs text-zinc-400">Sent to +91 {phone}</p>
                </div>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="otp" className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      6-Digit OTP
                    </label>
                    <button
                      type="button"
                      onClick={() => setStep('phone')}
                      className="text-xs font-medium text-zinc-400 hover:text-white"
                    >
                      Change Number
                    </button>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                    <input
                      id="otp"
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-3.5 pl-12 pr-4 font-mono text-2xl font-bold tracking-[0.4em] text-white placeholder-zinc-700 outline-none transition-colors focus:border-zinc-500 focus:bg-zinc-900 text-center"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={otp.length < 6 || isLoading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 font-bold text-zinc-950 transition-all hover:bg-zinc-200 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Verify & Open Pass{' '}
                      <QrCode className="h-4 w-4 transition-transform group-hover:scale-110" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </SpotlightCard>

        <div className="mt-8 flex items-center justify-between text-xs text-zinc-400">
          <a href="/" className="font-medium hover:text-white transition-colors">
            ← Back to Homepage
          </a>
          <a href="/admin" className="font-medium hover:text-white transition-colors">
            Gym Owner Console →
          </a>
        </div>
      </div>
    </div>
  );
}
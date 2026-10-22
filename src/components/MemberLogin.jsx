import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, CheckCircle2, Dumbbell, RefreshCw } from 'lucide-react';
import { checkMemberAndSendOTP, verifyWhatsAppOTP } from '../services/whatsappAuthService';

export default function MemberLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Enter Phone, 2: Enter WhatsApp OTP
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [memberName, setMemberName] = useState('');
  const [otpInfo, setOtpInfo] = useState(null);

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    setError('');

    const res = await checkMemberAndSendOTP(phone);
    setLoading(false);

    if (res.success) {
      setOtp('');
      setMemberName(res.memberName || 'Member');
      setOtpInfo(res);
      setStep(2);
    } else {
      setError(res.message || 'Could not verify phone number.');
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    setLoading(true);
    setError('');

    const res = await verifyWhatsAppOTP(phone, otp);
    setLoading(false);

    if (res.success) {
      localStorage.setItem('guru_member_session', JSON.stringify(res.member));
      navigate('/member');
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-white shadow-xl">
            <Dumbbell size={28} className="text-zinc-100" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Member Portal</h1>
          <p className="text-zinc-300 text-sm font-medium">Guru Fitness Health Club, Dhule</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">Registered Mobile Number</label>
              <div className="relative flex items-center">
                <input
                  type="tel"
                  maxLength="15"
                  placeholder="e.g. 9823039257 or 8788873330"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl py-4 px-4 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition font-semibold text-lg"
                  required
                  autoFocus
                />
              </div>
              <p className="text-xs text-zinc-400 pt-1 font-medium">We verify your registered membership and dispatch your OTP via WhatsApp.</p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-medium leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-extrabold text-base transition flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
            >
              {loading ? 'Sending WhatsApp OTP...' : 'Get WhatsApp OTP'} <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="space-y-3 text-center">
              <div className="text-sm font-bold text-zinc-200">
                Welcome, <span className="text-white font-black">{memberName}</span>!
              </div>

              {otpInfo?.apiDelivered && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold mb-1">
                  <CheckCircle2 size={14} /> Login code sent to {phone} on WhatsApp
                </div>
              )}

              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block pt-2">Enter 6-Digit OTP</label>

              <input
                type="text"
                maxLength="6"
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl py-4 text-center tracking-[0.75em] text-3xl font-black text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-400 transition"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-extrabold text-base transition flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Enter Portal'} <Shield size={18} />
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-zinc-400 hover:text-zinc-200 font-medium transition"
              >
                ← Different number
              </button>

              <button
                type="button"
                onClick={() => handleSendOTP()}
                disabled={loading}
                className="text-zinc-400 hover:text-white font-medium flex items-center gap-1 transition disabled:opacity-50"
              >
                <RefreshCw size={12} /> Resend OTP
              </button>
            </div>
          </form>
        )}

        <div className="text-center pt-4 border-t border-zinc-800">
          <Link to="/" className="text-xs text-zinc-400 hover:text-zinc-200 font-medium transition">← Back to Home</Link>
        </div>

      </div>
    </div>
  );
}
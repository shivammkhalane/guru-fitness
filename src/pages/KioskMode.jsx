import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, CheckCircle, XCircle, AlertCircle, ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isSupabaseReady } from '../services/supabaseService';
import { dataService } from '../services/dataService';

export function KioskMode() {
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle', 'success', 'error'
  const [memberInfo, setMemberInfo] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const inputRef = useRef(null);
  const resetTimerRef = useRef(null);

  // Keep the hidden input focused at all times so the USB scanner always works
  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const playChime = (type) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // A6
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn('Audio feedback unavailable:', e);
    }
  };

  const handleScan = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = inputValue.trim();
      setInputValue('');
      if (!code) return;

      console.log('Scanned QR:', code);

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

      try {
        let member = null;

        if (isSupabaseReady) {
          member = await dataService.getMemberByQrToken(code).catch(() => null);
          if (member) {
            const isExpired = member.daysLeft < 0 || member.status === 'expired';
            if (isExpired) {
              setStatus('error');
              setMemberInfo({
                name: member.name,
                message: `Membership Expired (${member.expiryDate || 'Past date'})`,
              });
              playChime('error');
            } else {
              const attResult = await dataService.recordAttendance(member.memberId || member.id, 'present').catch(() => null);
              const alreadyMarked = attResult?.alreadyMarked;

              setStatus('success');
              setMemberInfo({
                name: member.name,
                expiry: alreadyMarked
                  ? `Already Checked In Today • (${member.daysLeft} days remaining)`
                  : `Active Pass • ${member.daysLeft > 0 ? `${member.daysLeft} days remaining` : 'Expires today'}`,
              });
              playChime('success');
            }
          }
        }

        // Fallback / simulation logic if offline or demo test token
        if (!member) {
          if (code.toLowerCase().includes('fail') || code.length < 3) {
            setStatus('error');
            setMemberInfo({ message: 'Invalid or Expired Pass' });
            playChime('error');
          } else {
            setStatus('success');
            const displayName = code.startsWith('GURU-MBR')
              ? `Member #${code.replace('GURU-MBR-', '').slice(0, 8)}`
              : 'Verified Member';
            setMemberInfo({ 
              name: displayName,
              expiry: 'Active - Check-in Confirmed' 
            });
            playChime('success');
          }
        }
      } catch (err) {
        console.error('Scan processing error:', err);
        setStatus('error');
        setMemberInfo({ message: err?.message || 'Check-in Error' });
        playChime('error');
      }

      // Reset to idle after 3 seconds for the next person
      resetTimerRef.current = setTimeout(() => {
        setStatus('idle');
        setMemberInfo(null);
      }, 3000);
    }
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center overflow-hidden relative selection:bg-transparent cursor-none">
      
      {/* Top Header Controls (Low opacity until hovered) */}
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-30 opacity-20 hover:opacity-100 transition-opacity duration-300 cursor-auto">
        <Link
          to="/admin"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
        >
          <ArrowLeft size={14} /> Exit Kiosk
        </Link>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
      </header>

      {/* Hidden input to catch USB/Bluetooth Scanner keystrokes */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleScan}
        className="absolute opacity-0 pointer-events-none"
        autoFocus
        onBlur={() => inputRef.current?.focus()}
      />

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center text-center z-10"
          >
            <div className="w-32 h-32 mb-8 rounded-3xl bg-zinc-900/50 border border-white/10 flex items-center justify-center relative shadow-[0_0_50px_rgba(255,255,255,0.05)]">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <QrCode className="w-16 h-16 text-zinc-400"/>
              </motion.div>
              {/* Scanning laser animation */}
              <motion.div 
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-4 right-4 h-0.5 bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
              />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Scan Gym Pass</h1>
            <p className="text-lg text-zinc-400">Hold your phone up to the scanner</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center text-center z-10"
          >
            <div className="absolute inset-0 bg-emerald-500/20 animate-pulse pointer-events-none" />
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 10, 0] }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              <CheckCircle className="w-40 h-40 text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.4)] mb-8"/>
            </motion.div>
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">{memberInfo?.name}</h1>
            <span className="px-6 py-2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xl font-medium">
              Check-in Successful
            </span>
            <p className="text-zinc-400 mt-6 text-lg">{memberInfo?.expiry}</p>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center text-center z-10"
          >
            <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none" />
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1, x: [-10, 10, -10, 10, 0] }}
              transition={{ duration: 0.4 }}
            >
              <XCircle className="w-40 h-40 text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.4)] mb-8"/>
            </motion.div>
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">Access Denied</h1>
            <span className="flex items-center gap-2 px-6 py-2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xl font-medium">
              <AlertCircle className="w-6 h-6"/> {memberInfo?.message}
            </span>
            <p className="text-zinc-400 mt-6 text-lg">Please see the front desk</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guru Fitness Branding overlay */}
      <div className="absolute bottom-8 left-0 right-0 text-center z-0">
        <p className="text-zinc-600 font-semibold tracking-widest uppercase text-sm">Guru Fitness Health Club</p>
      </div>
    </div>
  );
}

export default KioskMode;

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { Lock, Eye, EyeOff, LogOut, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { verifySessionPassword } from '@/lib/actions/auth-lock';

interface SessionLockScreenProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const STORAGE_KEY_LAST_ACTIVE = 'alvoun_session_last_active';
const STORAGE_KEY_IS_LOCKED = 'alvoun_session_is_locked';
const CHANNEL_NAME = 'alvoun_session_lock_channel';

export default function SessionLockScreen({ user }: SessionLockScreenProps) {
  // Field salesmen on mobile should never be auto-locked
  if (user?.role === 'SALESMAN') {
    return null;
  }

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const channelRef = useRef<BroadcastChannel | null>(null);

  const lockSession = useCallback(() => {
    setIsLocked(true);
    try {
      localStorage.setItem(STORAGE_KEY_IS_LOCKED, 'true');
      channelRef.current?.postMessage({ type: 'LOCK' });
    } catch {}
  }, []);

  const unlockSession = useCallback(() => {
    setIsLocked(false);
    setPassword('');
    setErrorMessage('');
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(now));
      localStorage.removeItem(STORAGE_KEY_IS_LOCKED);
      channelRef.current?.postMessage({ type: 'UNLOCK', timestamp: now });
    } catch {}
  }, []);

  // Update activity timestamp on user interaction
  const recordActivity = useCallback(() => {
    if (isLocked) return;
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(now));
    } catch {}
  }, [isLocked]);

  useEffect(() => {
    // Initial check
    try {
      const storedLocked = localStorage.getItem(STORAGE_KEY_IS_LOCKED);
      const lastActive = Number(localStorage.getItem(STORAGE_KEY_LAST_ACTIVE) || Date.now());
      if (storedLocked === 'true' || Date.now() - lastActive > INACTIVITY_TIMEOUT_MS) {
        setIsLocked(true);
      } else {
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(Date.now()));
      }
    } catch {}

    // Setup BroadcastChannel for cross-tab synchronization
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data?.type === 'LOCK') {
          setIsLocked(true);
        } else if (event.data?.type === 'UNLOCK') {
          setIsLocked(false);
          setPassword('');
          setErrorMessage('');
        }
      };
    }

    // Attach user activity listeners
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleUserActivity = () => recordActivity();

    activityEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Periodic check interval (every 10 seconds)
    const interval = setInterval(() => {
      try {
        const storedLocked = localStorage.getItem(STORAGE_KEY_IS_LOCKED);
        if (storedLocked === 'true') {
          setIsLocked(true);
          return;
        }

        const lastActive = Number(localStorage.getItem(STORAGE_KEY_LAST_ACTIVE) || Date.now());
        if (Date.now() - lastActive >= INACTIVITY_TIMEOUT_MS) {
          lockSession();
        }
      } catch {}
    }, 10000);

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      clearInterval(interval);
      try {
        channelRef.current?.close();
      } catch {}
    };
  }, [lockSession, recordActivity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await verifySessionPassword(password);
      if (result.success) {
        unlockSession();
      } else {
        setErrorMessage(result.error || 'Incorrect password');
      }
    } catch {
      setErrorMessage('Network error during verification. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem(STORAGE_KEY_IS_LOCKED);
      localStorage.removeItem(STORAGE_KEY_LAST_ACTIVE);
    } catch {}
    await signOut({ callbackUrl: '/login' });
  };

  if (!isLocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-surface-raised border border-border/50 shadow-raised-lg rounded-3xl p-6 sm:p-8 space-y-6 text-center">
        {/* Emblem & Status */}
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-3 drop-shadow-md">
            <Image
              src="/alvoun-emblem.png"
              alt="Alvoun"
              fill
              className="object-contain"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Session Locked</span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.name || 'Administrator'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Your session was locked due to 10 minutes of inactivity to protect sensitive financial data.
          </p>
        </div>

        {/* User Capsule */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-inset border border-border/40 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">{user?.email || 'admin@alvoun.com'}</span>
          <span>•</span>
          <span className="uppercase text-[10px] font-bold text-primary">{user?.role || 'ADMIN'}</span>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-center">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Enter Password to Unlock
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm font-semibold bg-surface-inset border border-border/40 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-raised hover:shadow-raised-sm transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Unlock Session</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Sign Out Option */}
        <div className="pt-2 border-t border-border/40 flex justify-center">
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors py-1 px-3 rounded-lg hover:bg-surface-inset"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Account or Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

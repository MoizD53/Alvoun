'use client';

import { useActionState, useState } from 'react';
import { authenticate } from '@/lib/actions';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import InstallPWA from './install-pwa';

export default function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );
  
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-700 tracking-[0.15em] uppercase mb-1" htmlFor="loginId">
            Login ID
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Mail className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <input
              id="loginId"
              type="text"
              name="loginId"
              placeholder="Enter your login ID"
              required
              className="block w-full appearance-none rounded-[12px] bg-white/50 border border-white/60 pl-10 pr-4 h-[44px] sm:h-[48px] text-[14px] text-slate-800 placeholder-slate-400 focus:border-[#0874C9] focus:bg-white/70 focus:outline-none focus:ring-1 focus:ring-[#0874C9] transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-700 tracking-[0.15em] uppercase mb-1" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Lock className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="••••••••••••"
              required
              minLength={6}
              className="block w-full appearance-none rounded-[12px] bg-white/50 border border-white/60 pl-10 pr-10 h-[44px] sm:h-[48px] text-[14px] text-slate-800 placeholder-slate-400 focus:border-[#0874C9] focus:bg-white/70 focus:outline-none focus:ring-1 focus:ring-[#0874C9] transition-all tracking-[0.2em]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        <div className="pt-1">
          <button
            type="submit"
            aria-disabled={isPending}
            className="group flex w-full justify-center items-center gap-2 rounded-[12px] bg-[#0874C9] px-4 h-[44px] sm:h-[48px] text-[13px] font-bold tracking-[0.1em] uppercase text-white shadow-lg shadow-[#0874C9]/20 hover:bg-[#075DA8] hover:shadow-[#0874C9]/30 hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0874C9] disabled:opacity-70 disabled:hover:translate-y-0 transition-all duration-200"
          >
            {isPending ? 'Signing in...' : 'Sign in'}
            {!isPending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />}
          </button>
        </div>
        
        <div className="text-center pt-2">
           <p className="text-slate-600/70 text-[10px] font-bold tracking-[0.2em] uppercase">Data is secured</p>
        </div>

        {errorMessage && (
          <div className="mt-4 p-4 rounded-[12px] bg-red-50 dark:bg-red-900/200/10 border border-red-500/20 text-center animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
            <p className="text-[14px] font-medium text-red-400">Unable to sign in</p>
            <p className="text-[13px] text-red-300/80 mt-1">{errorMessage}</p>
          </div>
        )}
      </form>

      <InstallPWA />
    </div>
  );
}

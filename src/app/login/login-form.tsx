'use client';

import { useActionState, useState } from 'react';
import { authenticate } from '@/lib/actions';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

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
          <label className="block text-[10px] font-bold text-white/70 tracking-[0.15em] uppercase mb-1" htmlFor="email">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/60">
              <Mail className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              required
              className="block w-full appearance-none rounded-[12px] bg-[#02060D]/40 border border-white dark:border-slate-950/10 pl-10 pr-4 h-[44px] sm:h-[48px] text-[14px] text-white placeholder-white/40 focus:border-[#0099FF] focus:bg-[#02060D]/60 focus:outline-none focus:ring-1 focus:ring-[#0099FF] transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-white/70 tracking-[0.15em] uppercase mb-1" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/60">
              <Lock className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="••••••••••••"
              required
              minLength={6}
              className="block w-full appearance-none rounded-[12px] bg-[#02060D]/40 border border-white dark:border-slate-950/10 pl-10 pr-10 h-[44px] sm:h-[48px] text-[14px] text-white placeholder-white/40 focus:border-[#0099FF] focus:bg-[#02060D]/60 focus:outline-none focus:ring-1 focus:ring-[#0099FF] transition-all tracking-[0.2em]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6C7A89] hover:text-white transition-colors"
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
           <p className="text-[#6C7A89]/60 text-[10px] font-bold tracking-[0.2em] uppercase">Data is secured</p>
        </div>

        {errorMessage && (
          <div className="mt-4 p-4 rounded-[12px] bg-red-50 dark:bg-red-900/200/10 border border-red-500/20 text-center animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
            <p className="text-[14px] font-medium text-red-400">Unable to sign in</p>
            <p className="text-[13px] text-red-300/80 mt-1">{errorMessage}</p>
          </div>
        )}
      </form>
    </div>
  );
}

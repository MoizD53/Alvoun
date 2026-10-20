import LoginForm from './login-form';
import Image from 'next/image';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center overflow-hidden relative bg-background px-4 sm:px-6 py-12">
      
      {/* Warm Ambient Radial Glow Background (replaces water plant photo) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-teal-100/40 dark:bg-teal-900/15 blur-3xl animate-ripple" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-amber-100/30 dark:bg-amber-900/10 blur-3xl animate-ripple" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-surface-raised/40 blur-2xl" />
      </div>

      <div className="w-full max-w-[420px] z-10 flex flex-col items-center">
        {/* Main Neumorphic Raised Card */}
        <div className="w-full bg-surface-raised border border-border-default shadow-raised rounded-3xl p-7 sm:p-9 flex flex-col items-center relative overflow-hidden animate-scale-in">
          
          {/* Top internal edge highlight (simulating directional light from top-left) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/15 to-transparent" />

          {/* Logo & Brand Header */}
          <div className="w-full text-center flex flex-col items-center mb-6">
            {/* Neumorphic Inset Logo Pill */}
            <div className="w-[190px] sm:w-[220px] h-[64px] sm:h-[72px] bg-surface-inset rounded-2xl mb-4 shadow-inset flex items-center justify-center relative border border-border-default p-2.5 transition-transform hover:scale-[1.02] duration-300">
              <div className="relative w-full h-full">
                <Image 
                  src="/alvoun-logo-wide.png" 
                  alt="ALVOUN Logo" 
                  fill 
                  className="object-contain" 
                  priority 
                  sizes="220px"
                />
              </div>
            </div>
            
            <h2 className="text-secondary text-[10px] sm:text-[11px] font-bold tracking-[0.25em] uppercase">
              Field Sales & Distribution
            </h2>
            
            {/* Subtle Divider */}
            <div className="w-[80px] h-[1px] bg-gradient-to-r from-transparent via-border-default to-transparent mt-4" />
          </div>

          {/* Login Form */}
          <div className="w-full">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Footer Pill */}
      <div className="z-10 mt-10 mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 px-6 py-3 rounded-full border border-border-default bg-surface-raised shadow-xs text-xs">
          <div className="flex items-center gap-2 text-secondary font-medium">
            <Lock className="w-3.5 h-3.5 opacity-70" strokeWidth={1.5} />
            <span>© 2026 ALVOUN. All rights reserved.</span>
          </div>
          <div className="hidden sm:block w-[1px] h-3.5 bg-border-default" />
          <div className="text-primary font-bold tracking-wide">
            Powered by Duokarma
          </div>
        </div>
      </div>
    </main>
  );
}

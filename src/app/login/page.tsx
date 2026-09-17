import LoginForm from './login-form';
import Image from 'next/image';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center overflow-hidden relative selection:bg-[#0874C9] selection:text-white px-4 sm:px-6 py-12">
      
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/login-bg.jpg" 
          alt="ALVOUN Background" 
          fill 
          className="object-cover" 
          priority 
        />
        {/* Subtle vignette/dark overlay so the form remains highly readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020B16]/70 via-[#020B16]/30 to-[#020B16]/80"></div>
      </div>

      <div className="w-full max-w-[440px] z-10 flex flex-col items-center mt-4">
        {/* Main Card - Upgraded to Premium Glass against photo */}
        <div className="w-full max-w-[400px] bg-[#0A121E]/60 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.8)] flex flex-col items-center relative overflow-hidden">
          
          {/* Top internal edge highlight */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-[1px] bg-gradient-to-r from-transparent via-[#0099FF]/50 to-transparent"></div>

          {/* Logo & Brand */}
          <div className="w-full animate-fade-in-up text-center flex flex-col items-center mb-6">
            <div className="w-[180px] sm:w-[220px] h-[60px] sm:h-[70px] bg-white rounded-2xl mb-5 shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-center relative overflow-hidden border border-white/20 p-2 transition-transform hover:scale-[1.02] duration-500">
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
            
            <p className="text-[#8FA7BA] text-[10px] sm:text-[11px] font-bold tracking-[0.25em] uppercase">
              Field Sales & Distribution
            </p>
            
            {/* Divider */}
            <div className="w-[80px] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mt-5"></div>
          </div>

          <div className="w-full">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Footer Pill */}
      <div className="z-10 mt-12 mb-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 px-6 py-4 rounded-full border border-white/10 bg-[#060D16]/80 backdrop-blur-md shadow-2xl text-[12px] md:text-[13px]">
          <div className="flex items-center gap-2 text-white/70">
            <Lock className="w-4 h-4 opacity-70" strokeWidth={1.5} />
            <span>© 2026 ALVOUN. All rights reserved.</span>
          </div>
          <div className="hidden sm:block w-[1px] h-4 bg-white/20"></div>
          <div className="text-white/90 font-medium tracking-wide drop-shadow-md">
            Powered by Duokarma
          </div>
        </div>
      </div>
    </main>
  );
}

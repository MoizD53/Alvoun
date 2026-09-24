import LoginForm from './login-form';
import Image from 'next/image';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center overflow-hidden relative selection:bg-[#0874C9] selection:text-white px-4 sm:px-6 py-12">
      
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/real-water-plant-bg.jpg" 
          alt="ALVOUN Background" 
          fill 
          className="object-cover" 
          priority 
        />
        {/* Light overlay to let the background shine while ensuring readability */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]"></div>
      </div>

      <div className="w-full max-w-[440px] z-10 flex flex-col items-center mt-4">
        {/* Main Card - Light Premium Glass */}
        <div className="w-full max-w-[400px] bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.1)] flex flex-col items-center relative overflow-hidden">
          
          {/* Top internal edge highlight */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>

          {/* Logo & Brand */}
          <div className="w-full animate-fade-in-up text-center flex flex-col items-center mb-6">
            <div className="w-[180px] sm:w-[220px] h-[60px] sm:h-[70px] bg-white/70 rounded-2xl mb-5 shadow-lg flex items-center justify-center relative overflow-hidden border border-white/80 p-2 transition-transform hover:scale-[1.02] duration-500">
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
            
            <p className="text-slate-700 text-[10px] sm:text-[11px] font-bold tracking-[0.25em] uppercase">
              Field Sales & Distribution
            </p>
            
            {/* Divider */}
            <div className="w-[80px] h-[1px] bg-gradient-to-r from-transparent via-slate-400/30 to-transparent mt-5"></div>
          </div>

          <div className="w-full">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Footer Pill */}
      <div className="z-10 mt-12 mb-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 px-6 py-4 rounded-full border border-white/50 bg-white/40 backdrop-blur-md shadow-lg text-[12px] md:text-[13px]">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Lock className="w-4 h-4 opacity-70" strokeWidth={1.5} />
            <span>© 2026 ALVOUN. All rights reserved.</span>
          </div>
          <div className="hidden sm:block w-[1px] h-4 bg-slate-400/50"></div>
          <div className="text-slate-800 font-bold tracking-wide">
            Powered by Duokarma
          </div>
        </div>
      </div>
    </main>
  );
}

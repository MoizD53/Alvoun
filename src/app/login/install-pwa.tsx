'use client';

import { useState, useEffect } from 'react';
import { Download, Info, Check, Share } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualInstruction, setShowManualInstruction] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowManualInstruction(false); // If prompt is available, we don't need manual
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also listen to appinstalled to hide button after success
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback
      setShowManualInstruction(true);
    }
  };

  return (
    <div className="mt-8 flex flex-col items-center">
      <div className="flex items-center w-full mb-6">
        <div className="flex-1 border-t border-slate-300/50"></div>
        <span className="px-3 text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">OR</span>
        <div className="flex-1 border-t border-slate-300/50"></div>
      </div>

      <button
        type="button"
        onClick={handleInstallClick}
        className="group flex w-full justify-center items-center gap-2 rounded-[12px] bg-white border-2 border-[#0874C9] px-4 h-[44px] sm:h-[48px] text-[13px] font-bold tracking-[0.1em] uppercase text-[#0874C9] shadow-sm hover:bg-slate-50 hover:-translate-y-[1px] transition-all duration-200"
      >
        <Download className="h-4 w-4" strokeWidth={2} />
        INSTALL ALVOUN APP
      </button>
      <p className="text-slate-500 text-[11px] font-medium mt-2">
        Install Alvoun for faster access.
      </p>

      {showManualInstruction && (
        <div className="mt-4 p-4 rounded-[12px] bg-slate-50 border border-slate-200 text-left animate-fade-in-up shadow-sm">
          <div className="flex items-start gap-2 text-[#0874C9] mb-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <h4 className="text-[12px] font-bold tracking-[0.1em] uppercase">Installation Manual</h4>
          </div>
          {isIOS ? (
            <p className="text-[12px] text-slate-600 leading-relaxed">
              To install Alvoun:<br/>
              Tap the <span className="inline-flex items-center gap-1 font-bold text-slate-800"><Share className="h-3 w-3"/> Share</span> button, then select <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p className="text-[12px] text-slate-600 leading-relaxed">
              Install isn't available automatically on this browser. Use your browser menu → <strong>Add to Home Screen</strong> / <strong>Install App</strong>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

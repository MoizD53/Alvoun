'use client';

import { useState, useEffect } from 'react';
import { Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertBanner } from '@/components/ui/alert-banner';

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
      setShowManualInstruction(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

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
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowManualInstruction(true);
    }
  };

  return (
    <div className="mt-6 flex flex-col items-center w-full">
      <div className="flex items-center w-full mb-4">
        <div className="flex-1 border-t border-border-default"></div>
        <span className="px-3 text-[10px] font-bold text-muted tracking-[0.2em] uppercase select-none">
          OR
        </span>
        <div className="flex-1 border-t border-border-default"></div>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={handleInstallClick}
        leftIcon={<Download className="h-4 w-4" />}
        className="w-full text-xs font-semibold"
      >
        Install Alvoun App
      </Button>
      <p className="text-muted text-[11px] font-medium mt-1.5 text-center">
        Install as a PWA for faster offline access
      </p>

      {showManualInstruction && (
        <div className="mt-4 w-full animate-fade-in-up">
          <AlertBanner
            variant="info"
            title="Installation Instructions"
            onClose={() => setShowManualInstruction(false)}
          >
            {isIOS ? (
              <p className="text-xs leading-relaxed">
                Tap the <span className="inline-flex items-center gap-1 font-bold"><Share className="h-3 w-3" /> Share</span> button in Safari, then select <strong>Add to Home Screen</strong>.
              </p>
            ) : (
              <p className="text-xs leading-relaxed">
                Use your browser menu (⋮) → select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
              </p>
            )}
          </AlertBanner>
        </div>
      )}
    </div>
  );
}

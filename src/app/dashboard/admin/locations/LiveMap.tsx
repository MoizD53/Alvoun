'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MapPin } from 'lucide-react';

interface SalesmanLocation {
  id: string;
  name: string;
  status: 'Live' | 'Stale' | 'Offline';
  lat?: number;
  lng?: number;
  accuracy?: number;
  lastUpdated?: string;
  ageText: string;
}

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] lg:h-[600px] bg-surface-sunken animate-pulse rounded-2xl flex flex-col items-center justify-center border border-border-subtle gap-2">
      <MapPin className="h-8 w-8 text-brand-teal animate-bounce" />
      <span className="text-text-muted font-bold text-xs uppercase tracking-wider">Loading Fleet Map...</span>
    </div>
  )
});

export default function LiveMap({ salesmen }: { salesmen: SalesmanLocation[] }) {
  const router = useRouter();

  // Auto-refresh data every 60s only when tab is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        router.refresh();
      }
    }, 60000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router]);

  return <LeafletMap salesmen={salesmen} />;
}

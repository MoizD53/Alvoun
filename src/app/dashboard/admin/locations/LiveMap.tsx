'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
    <div className="w-full h-[450px] lg:h-[600px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800">
      <span className="text-slate-400 font-medium">Loading Map...</span>
    </div>
  )
});

export default function LiveMap({ salesmen }: { salesmen: SalesmanLocation[] }) {
  const router = useRouter();

  // Auto-refresh data every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  return <LeafletMap salesmen={salesmen} />;
}

import { prisma } from '@/lib/db';
import { getKolkataDateOnly, getCurrentKolkataTime } from '@/lib/time';
import LiveMap from './LiveMap';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Navigation, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { isFinancialRole } from '@/lib/rbac';

export default async function AdminLocationsPage() {
  const session = await auth();
  if (!session?.user || !isFinancialRole(session.user.role)) {
    redirect('/dashboard');
  }
  const today = getKolkataDateOnly(getCurrentKolkataTime());
  const now = getCurrentKolkataTime().getTime();

  // Get active salesmen and their work sessions for today
  const salesmen = await prisma.salesman.findMany({
    where: { isActive: true },
    include: {
      workSessions: {
        where: { workDate: today },
        take: 1, // At most 1 per day per unique constraint
        include: {
          locations: {
            orderBy: { recordedAt: 'desc' },
            take: 1
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  const displayData = salesmen.map(s => {
    const session = s.workSessions[0];
    const latestLoc = session?.locations?.[0];
    
    let status: 'Live' | 'Stale' | 'Offline' = 'Offline';
    let ageText = '—';
    let lastUpdated = '—';
    const isWorking = session?.status === 'ACTIVE';

    if (isWorking && latestLoc) {
      const ageSeconds = (now - latestLoc.recordedAt.getTime()) / 1000;
      lastUpdated = latestLoc.recordedAt.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

      if (ageSeconds < 120) {
        status = 'Live';
        ageText = ageSeconds < 60 ? 'Just now' : `${Math.floor(ageSeconds)} sec ago`;
      } else if (ageSeconds <= 600) {
        status = 'Stale';
        ageText = `${Math.floor(ageSeconds / 60)} min ago`;
      } else {
        status = 'Offline';
        ageText = '> 10 min ago';
      }
    }

    if (!isWorking) {
      status = 'Offline';
      ageText = 'Not working';
    }

    return {
      id: s.id,
      name: s.name,
      status,
      lat: latestLoc?.latitude,
      lng: latestLoc?.longitude,
      accuracy: latestLoc?.accuracy,
      lastUpdated,
      ageText,
      isWorking
    };
  });

  const activeCount = displayData.filter(d => d.isWorking).length;
  const liveCount = displayData.filter(d => d.status === 'Live').length;

  return (
    <div className="space-y-6 animate-fade-in-up pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/admin" 
            className="w-10 h-10 flex items-center justify-center bg-surface-raised rounded-2xl shadow-raised-sm border border-border-default text-primary active:shadow-inset active:scale-95 transition-all"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-primary tracking-tight">Live Fleet Map</h1>
            <p className="text-xs font-semibold text-secondary mt-0.5">Real-time GPS tracking and live field staff coordinates.</p>
          </div>
        </div>
        
        {/* Metric Badges */}
        <div className="flex items-center gap-2.5">
          <div className="bg-surface-inset shadow-inset border border-border-default px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold">
            <span className="text-secondary">Active Today:</span>
            <span className="text-primary font-black text-sm">{activeCount}</span>
          </div>
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-4 py-2 rounded-2xl shadow-raised-sm flex items-center gap-2 text-xs font-black">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{liveCount} Live Signals</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-default p-3 sm:p-4">
        <LiveMap salesmen={displayData} />
      </div>

      {/* Fleet Status Table */}
      <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-default overflow-hidden">
        <div className="p-5 border-b border-border-default bg-surface-inset flex items-center gap-2">
          <Navigation className="h-4 w-4 text-teal-800 dark:text-teal-400" />
          <h2 className="font-black text-primary tracking-tight">Fleet Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-surface-inset text-primary font-extrabold text-xs uppercase tracking-wider border-b border-border-default">
              <tr>
                <th className="px-6 py-4">Salesman</th>
                <th className="px-6 py-4">Work Status</th>
                <th className="px-6 py-4 text-center">GPS Status</th>
                <th className="px-6 py-4 text-right">Last Updated</th>
                <th className="px-6 py-4 text-right">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {displayData.map((s) => (
                <tr key={s.id} className="hover:bg-surface-inset/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-black text-primary text-base">{s.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    {s.isWorking ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-raised-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Working
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-inset text-secondary border border-border-default shadow-inset-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Off Duty
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {s.status === 'Live' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-black shadow-raised-sm">
                        ⚡ Live
                      </span>
                    )}
                    {s.status === 'Stale' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-full text-xs font-black shadow-raised-sm">
                        ⏳ Stale
                      </span>
                    )}
                    {s.status === 'Offline' && (
                      <span className="inline-flex items-center px-3 py-1 bg-surface-inset text-secondary rounded-full text-xs font-semibold border border-border-default shadow-inset-sm">
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-secondary">{s.lastUpdated}</td>
                  <td className="px-6 py-4 text-right text-secondary text-xs font-medium">{s.ageText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

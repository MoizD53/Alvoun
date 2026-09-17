import { prisma } from '@/lib/db';
import { getKolkataDateOnly, getCurrentKolkataTime } from '@/lib/time';
import LiveMap from './LiveMap';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { MapPin, Navigation } from 'lucide-react';

export default async function AdminLocationsPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
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
      employeeCode: s.employeeCode,
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
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Live Fleet Map</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time GPS tracking of field salesmen.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-950 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 text-sm font-medium">
            <span className="text-slate-500 dark:text-slate-400">Active Today:</span>
            <span className="text-slate-900 dark:text-slate-100">{activeCount}</span>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-100 flex items-center gap-2 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-50 dark:bg-green-900/200"></span>
            </span>
            <span className="text-green-700">{liveCount} Live Signals</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-2 md:p-4">
        <LiveMap salesmen={displayData} />
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
          <Navigation className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <h2 className="font-bold text-slate-900 dark:text-slate-100">Fleet Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3">Salesman</th>
                <th className="px-6 py-3">Work Status</th>
                <th className="px-6 py-3 text-center">GPS Status</th>
                <th className="px-6 py-3 text-right">Last Updated</th>
                <th className="px-6 py-3 text-right">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayData.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{s.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{s.employeeCode}</div>
                  </td>
                  <td className="px-6 py-4">
                    {s.isWorking ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 border border-green-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-50 dark:bg-green-900/200"></span> Working
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Off Duty
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {s.status === 'Live' && <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold shadow-sm">⚡ Live</span>}
                    {s.status === 'Stale' && <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold shadow-sm">⏳ Stale</span>}
                    {s.status === 'Offline' && <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800">Offline</span>}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">{s.lastUpdated}</td>
                  <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 text-sm">{s.ageText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

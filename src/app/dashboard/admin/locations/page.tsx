import { prisma } from '@/lib/db';
import { getKolkataDateOnly, getCurrentKolkataTime } from '@/lib/time';
import LiveMap from './LiveMap';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Live Salesman Locations</h1>
        
        <LiveMap salesmen={displayData} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Salesman</th>
                <th className="px-6 py-4">Emp Code</th>
                <th className="px-6 py-4">Work Status</th>
                <th className="px-6 py-4">Location Status</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayData.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                  <td className="px-6 py-4 text-slate-500">{s.employeeCode}</td>
                  <td className="px-6 py-4">
                    {s.isWorking ? (
                      <span className="flex items-center gap-1.5 text-green-700 font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Working
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span> Not Working
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {s.status === 'Live' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">🟢 Live</span>}
                    {s.status === 'Stale' && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold">🟡 Stale</span>}
                    {s.status === 'Offline' && <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">🔴 Offline</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{s.lastUpdated}</td>
                  <td className="px-6 py-4 text-slate-600">{s.ageText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

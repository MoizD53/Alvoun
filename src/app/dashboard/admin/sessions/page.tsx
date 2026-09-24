import { prisma } from '@/lib/db';
import { getKolkataDateOnly, getCurrentKolkataTime } from '@/lib/time';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Activity, Clock, CheckCircle2, UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function AdminSessionsPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
    redirect('/dashboard');
  }
  const today = getKolkataDateOnly(getCurrentKolkataTime());

  const sessions = await prisma.workSession.findMany({
    where: {
      workDate: today
    },
    include: {
      salesman: true
    },
    orderBy: {
      loginAt: 'desc'
    }
  });

  const activeSessionsCount = sessions.filter(s => s.status === 'ACTIVE').length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin" className="p-2 bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Work Sessions</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitor daily attendance and field staff activity.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 px-3 py-1.5 rounded-md text-sm font-medium border border-green-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-50 dark:bg-green-900/200"></span>
            </span>
            {activeSessionsCount} Active Now
          </div>
          <Link href="/dashboard/admin/locations" className="px-4 py-2 bg-alvoun-blue text-white rounded-md text-sm font-medium hover:bg-alvoun-dark transition-colors shadow-sm">
            View Live Map
          </Link>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3">Salesman</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Login Time</th>
                <th className="px-6 py-3">Logout Time</th>
                <th className="px-6 py-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Clock className="h-8 w-8 mb-3 text-slate-300" />
                      <p className="text-base font-medium text-slate-600 dark:text-slate-400">No sessions today</p>
                      <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">Salesmen haven't logged in for work yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sessions.map((ws) => {
                  let duration = '-';
                  if (ws.logoutAt) {
                    const diffMs = ws.logoutAt.getTime() - ws.loginAt.getTime();
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    duration = `${hours}h ${mins}m`;
                  } else {
                    const diffMs = getCurrentKolkataTime().getTime() - ws.loginAt.getTime();
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    duration = `${hours}h ${mins}m (Active)`;
                  }

                  return (
                    <tr key={ws.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{ws.salesman.name}</td>
                      <td className="px-6 py-4">
                        {ws.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/20 text-alvoun-green border border-green-100">
                            <Activity className="h-3 w-3" /> Working
                          </span>
                        )}
                        {ws.status === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                            <CheckCircle2 className="h-3 w-3" /> Completed
                          </span>
                        )}
                        {ws.status === 'FORCE_CLOSED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 dark:bg-red-900/20 text-alvoun-red border border-red-100">
                            <AlertCircle className="h-3 w-3" /> Force Closed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                        {ws.loginAt.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                        {ws.logoutAt ? ws.logoutAt.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                        {duration}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

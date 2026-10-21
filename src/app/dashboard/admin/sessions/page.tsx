export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { getKolkataDateOnly, getCurrentKolkataTime } from '@/lib/time';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Clock, CheckCircle2, AlertCircle, ArrowLeft, MapPin } from 'lucide-react';
import Link from 'next/link';
import { isFinancialRole } from '@/lib/rbac';

export default async function AdminSessionsPage() {
  const session = await auth();
  if (!session?.user || !isFinancialRole(session.user.role)) {
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
            <h1 className="text-2xl font-black text-primary tracking-tight">Work Sessions</h1>
            <p className="text-xs font-semibold text-secondary mt-0.5">Monitor daily attendance, active logins, and field staff work sessions.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-4 py-2 rounded-2xl text-xs font-black border border-emerald-500/30 shadow-raised-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{activeSessionsCount} Active Now</span>
          </div>
          <Link 
            href="/dashboard/admin/locations" 
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-2xl text-xs font-black shadow-raised active:scale-95 transition-all"
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>View Live Map</span>
          </Link>
        </div>
      </div>
      
      {/* Sessions Table Container */}
      <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-default overflow-hidden">
        <div className="overflow-x-auto min-h-[260px]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-surface-inset text-primary font-extrabold text-xs uppercase tracking-wider border-b border-border-default">
              <tr>
                <th className="px-6 py-4">Salesman</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Login Time</th>
                <th className="px-6 py-4">Logout Time</th>
                <th className="px-6 py-4">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-secondary">
                      <div className="w-14 h-14 bg-surface-inset shadow-inset border border-border-default rounded-2xl flex items-center justify-center mb-3 text-secondary">
                        <Clock className="h-7 w-7" />
                      </div>
                      <p className="text-base font-black text-primary">No sessions today</p>
                      <p className="text-xs font-semibold text-secondary mt-1">Field staff have not logged in for work yet.</p>
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
                  } else if (ws.status === 'ACTIVE') {
                    const diffMs = getCurrentKolkataTime().getTime() - ws.loginAt.getTime();
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    duration = `${hours}h ${mins}m (Active)`;
                  }

                  return (
                    <tr key={ws.id} className="hover:bg-surface-inset/40 transition-colors">
                      <td className="px-6 py-4 font-black text-primary text-base">{ws.salesman.name}</td>
                      <td className="px-6 py-4">
                        {ws.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-raised-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active
                          </span>
                        )}
                        {ws.status === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-inset text-secondary border border-border-default shadow-inset-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                            Logged Out
                          </span>
                        )}
                        {ws.status === 'FORCE_CLOSED' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-danger border border-red-500/30 shadow-raised-sm">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Force Closed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-secondary font-bold">
                        {ws.loginAt.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-secondary font-bold">
                        {ws.logoutAt ? ws.logoutAt.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : <span className="text-secondary font-normal">—</span>}
                      </td>
                      <td className="px-6 py-4 text-secondary font-medium text-xs">
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

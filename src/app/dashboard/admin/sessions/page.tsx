import { prisma } from '@/lib/db';
import { getKolkataDateOnly, getCurrentKolkataTime } from '@/lib/time';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Today's Salesman Sessions</h1>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Salesman</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Login Time</th>
              <th className="px-4 py-3">Logout Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No sessions recorded today.</td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{session.salesman.name}</td>
                  <td className="px-4 py-3">
                    {session.status === 'ACTIVE' && <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Working</span>}
                    {session.status === 'COMPLETED' && <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Completed</span>}
                    {session.status === 'FORCE_CLOSED' && <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Force Closed</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{session.loginAt.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-3 text-slate-600">{session.logoutAt ? session.logoutAt.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

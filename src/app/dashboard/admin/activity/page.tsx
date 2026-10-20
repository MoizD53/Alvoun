import { prisma } from '@/lib/db';
import { History, ArrowLeft, Activity } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ActivityLogPage() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      salesman: true
    }
  });

  return (
    <div className="space-y-6 animate-fade-in-up pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard/admin" 
          className="w-10 h-10 flex items-center justify-center bg-surface-raised rounded-2xl shadow-raised-sm border border-border-subtle text-text-primary active:shadow-inset active:scale-95 transition-all"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Activity Log</h1>
          <p className="text-xs font-semibold text-text-muted mt-0.5">Audit log of system activities, transactions, and salesman operations.</p>
        </div>
      </div>

      {/* Activity Table Container */}
      <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface/80 text-text-muted font-bold text-xs uppercase tracking-wider border-b border-border-subtle">
              <tr>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Action Type</th>
                <th className="px-6 py-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-14 h-14 bg-surface-sunken shadow-inset border border-border-subtle rounded-2xl flex items-center justify-center mb-3 text-text-muted">
                        <Activity className="h-7 w-7" />
                      </div>
                      <p className="text-base font-black text-text-primary">No activity logs recorded</p>
                      <p className="text-xs font-semibold text-text-muted mt-1">System operations and field actions will appear here in chronological order.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-sunken/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-text-muted">
                      {log.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4 font-black text-text-primary text-sm whitespace-nowrap">
                      {log.salesman?.name || 'System Admin'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-surface-sunken shadow-inset-sm text-text-secondary border border-border-subtle">
                        {log.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-text-secondary">
                      {log.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

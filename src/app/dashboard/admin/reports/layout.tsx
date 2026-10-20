import ReportsNav from './ReportsNav';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { BarChart3 } from 'lucide-react';

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Reports Header & Navigation Card */}
      <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-inset shadow-inset border border-border/40 flex items-center justify-center text-primary shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Business Intelligence & Reports</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Daily registers, monthly sales trends, market dues, and product performance
              </p>
            </div>
          </div>
        </div>

        <ReportsNav />
      </div>

      <div>
        {children}
      </div>
    </div>
  );
}

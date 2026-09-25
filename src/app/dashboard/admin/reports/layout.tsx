import ReportsNav from './ReportsNav';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

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
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 px-2">Business Reports</h1>
        <ReportsNav />
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}

import Link from 'next/link';
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
        <nav className="flex flex-wrap gap-2">
          <Link href="/dashboard/admin/reports/daily" className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300">Daily Sales</Link>
          <Link href="/dashboard/admin/reports/monthly" className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300">Monthly Sales</Link>
          <Link href="/dashboard/admin/reports/outstanding" className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300">Outstanding</Link>
          <Link href="/dashboard/admin/reports/products" className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300">Products</Link>
        </nav>
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}

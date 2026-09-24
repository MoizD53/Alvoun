import { getSalesmenAccounts } from '@/lib/actions/admin/salesman-management';
import SalesmanList from './components/SalesmanList';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SalesmenPage() {
  const salesmen = await getSalesmenAccounts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin" className="p-2 bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Salesmen</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage salesman profiles, login credentials, and territory</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <Link href="/dashboard/admin/salesmen" className="px-4 py-2 text-sm font-medium border-b-2 border-alvoun-blue text-alvoun-blue">
          Accounts & Profiles
        </Link>
        <Link href="/dashboard/admin/salesmen-access" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          Territory Assignment
        </Link>
      </div>
      
      <SalesmanList initialSalesmen={salesmen} />
    </div>
  );
}

import CustomerForm from '../customer-form';
import { getStates } from '@/lib/actions/state';
import { getCities } from '@/lib/actions/city';
import { getRoutes } from '@/lib/actions/route';
import { getSalesmen } from '@/lib/actions/salesman';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function NewCustomerPage() {
  const [states, cities, routes, salesmen] = await Promise.all([
    getStates(),
    getCities(),
    getRoutes(),
    getSalesmen()
  ]);

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 sm:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/admin/customers" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add New Customer</h1>
      </div>
      
      <CustomerForm 
        states={states}
        cities={cities}
        routes={routes}
        salesmen={salesmen}
      />
    </div>
  );
}

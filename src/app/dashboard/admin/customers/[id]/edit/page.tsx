import CustomerForm from '../../customer-form';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getStates } from '@/lib/actions/state';
import { getCities } from '@/lib/actions/city';
import { getRoutes } from '@/lib/actions/route';
import { getSalesmen } from '@/lib/actions/salesman';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function EditCustomerPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  const customerId = resolvedParams.id;

  const [customer, states, cities, routes, salesmen] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId }
    }),
    getStates(),
    getCities(),
    getRoutes(),
    getSalesmen()
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 sm:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/dashboard/admin/customers/${customer.id}`} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Edit Customer</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{customer.customerName}</p>
        </div>
      </div>
      
      <CustomerForm 
        initialData={customer}
        states={states}
        cities={cities}
        routes={routes}
        salesmen={salesmen}
      />
    </div>
  );
}

import CustomerForm from '../customer-form';
import { getCustomer } from '@/lib/actions/customer';
import { getStates } from '@/lib/actions/state';
import { getCities } from '@/lib/actions/city';
import { getRoutes } from '@/lib/actions/route';
import { getSalesmen } from '@/lib/actions/salesman';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function EditCustomerPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  const customer = await getCustomer(resolvedParams.id);
  
  if (!customer) notFound();

  const [states, cities, routes, salesmen] = await Promise.all([
    getStates(),
    getCities(),
    getRoutes(),
    getSalesmen()
  ]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/admin/customers" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Customer</h1>
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

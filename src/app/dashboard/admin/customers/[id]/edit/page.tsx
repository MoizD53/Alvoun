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
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link 
          href={`/dashboard/admin/customers/${customer.id}`} 
          className="p-2.5 bg-surface-raised shadow-raised hover:shadow-raised-sm press-active rounded-xl text-muted-foreground hover:text-foreground transition-all border border-border/40"
          aria-label="Back to Customer Profile"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Edit Customer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Modifying account details for <span className="font-semibold text-primary">{customer.customerName}</span></p>
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

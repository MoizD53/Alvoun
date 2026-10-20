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
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/admin/customers" 
          className="p-2.5 bg-surface-raised shadow-raised hover:shadow-raised-sm press-active rounded-xl text-muted-foreground hover:text-foreground transition-all border border-border/40"
          aria-label="Back to Customers"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Add New Customer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Register a retail partner, assign territory, and initialize balance</p>
        </div>
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

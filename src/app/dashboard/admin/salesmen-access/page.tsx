import AccessManager from './components/AccessManager';
import { getSalesmenAccess, getRoutesAndAreas } from '@/lib/actions/admin/salesman-access';
import Link from 'next/link';
import { ArrowLeft, Users, Navigation } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SalesmenAccessPage() {
  const salesmenData = await getSalesmenAccess();
  const routesData = await getRoutesAndAreas();

  return (
    <div className="space-y-6 animate-fade-in-up pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard/admin/salesmen" 
          className="w-10 h-10 flex items-center justify-center bg-surface-raised rounded-2xl shadow-raised-sm border border-border-subtle text-text-primary active:shadow-inset active:scale-95 transition-all"
          aria-label="Back to salesmen"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Salesmen Territory Assignment</h1>
          <p className="text-xs font-semibold text-text-muted mt-0.5">Manage route access and multi-area customer coverage for field staff.</p>
        </div>
      </div>

      {/* Navigation Inset Pills */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-sunken shadow-inset rounded-2xl border border-border-subtle max-w-fit">
        <Link 
          href="/dashboard/admin/salesmen" 
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-primary transition-all"
        >
          <Users className="h-4 w-4" />
          <span>Accounts & Profiles</span>
        </Link>
        <Link 
          href="/dashboard/admin/salesmen-access" 
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-brand-teal text-white shadow-raised-sm transition-all"
        >
          <Navigation className="h-4 w-4" />
          <span>Territory Assignment</span>
        </Link>
      </div>

      <AccessManager initialSalesmen={salesmenData} routes={routesData} />
    </div>
  );
}

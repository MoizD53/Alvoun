import { getSalesmenAccounts } from '@/lib/actions/admin/salesman-management';
import SalesmanList from './components/SalesmanList';
import Link from 'next/link';
import { ArrowLeft, Users, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SalesmenPage() {
  const salesmen = await getSalesmenAccounts();

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/admin" 
            className="p-2.5 bg-surface-raised shadow-raised hover:shadow-raised-sm press-active rounded-xl text-muted-foreground hover:text-foreground transition-all border border-border/40"
            aria-label="Back to Admin Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Sales Force</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage field salesman profiles, app credentials, and territory assignments</p>
          </div>
        </div>
      </div>

      {/* Neumorphic Navigation Tabs Strip */}
      <div className="inline-flex bg-surface-inset shadow-inset p-1 rounded-2xl border border-border/40 gap-1">
        <Link 
          href="/dashboard/admin/salesmen" 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-surface-raised shadow-raised text-primary border border-border/40 transition-all"
        >
          <Users className="w-4 h-4" />
          Accounts & Profiles
        </Link>
        <Link 
          href="/dashboard/admin/salesmen-access" 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
        >
          <MapPin className="w-4 h-4" />
          Territory Assignment
        </Link>
      </div>
      
      <SalesmanList initialSalesmen={salesmen} />
    </div>
  );
}

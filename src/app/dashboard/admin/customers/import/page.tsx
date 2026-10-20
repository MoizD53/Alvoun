import CustomerImporter from './importer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ImportCustomersPage() {
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Import Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Bulk upload customer accounts, routes, and opening balances via Excel or CSV</p>
        </div>
      </div>
      
      <CustomerImporter />
    </div>
  );
}

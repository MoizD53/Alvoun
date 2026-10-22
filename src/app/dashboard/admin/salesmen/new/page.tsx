import SalesmanForm from '../components/SalesmanForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NewSalesmanPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard/admin/salesmen" 
          className="p-2.5 bg-surface-raised shadow-raised hover:shadow-raised-sm press-active rounded-xl text-muted-foreground hover:text-foreground transition-all border border-border/40"
          aria-label="Back to Salesmen"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Add Salesman</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create a new field salesman profile and mobile app credentials</p>
        </div>
      </div>
      
      <SalesmanForm />
    </div>
  );
}

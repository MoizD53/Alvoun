import CustomerImporter from './importer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ImportCustomersPage() {
  return (
    <div className="bg-slate-50 min-h-[80vh] rounded-xl p-4 sm:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/admin/customers" className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors bg-white shadow-sm border border-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Import Customers</h1>
      </div>
      
      <CustomerImporter />
    </div>
  );
}

import { getCustomerDetail } from '@/lib/actions/salesman/customer';
import Link from 'next/link';
import { ArrowLeft, Phone, MapPin } from 'lucide-react';
import VisitWorkflow from './VisitWorkflow';
import { notFound } from 'next/navigation';

export default async function CustomerDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  let customer;
  try {
    customer = await getCustomerDetail(resolvedParams.id);
  } catch (error) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/salesman/customers" className="p-2 bg-white rounded-full shadow-sm border border-slate-100 text-slate-600 active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900 truncate">{customer.customerName}</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
        <div>
          <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Outstanding Balance</div>
          <div className={`text-4xl font-bold ${customer.outstanding > 0 ? 'text-red-500' : (customer.outstanding < 0 ? 'text-green-500' : 'text-slate-900')}`}>
            ₹{(Math.abs(customer.outstanding) / 100).toFixed(2)}
            <span className="text-xl ml-1">{customer.outstanding > 0 ? 'Dr' : (customer.outstanding < 0 ? 'Cr' : '')}</span>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-50 space-y-4">
          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-slate-900">{customer.contact}</div>
              <div className="text-sm text-slate-500">Contact Number</div>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-slate-900">{customer.address}</div>
              <div className="text-sm text-slate-500">{customer.city.name}, {customer.state.name}</div>
              <div className="text-sm text-alvoun-blue font-medium mt-1">Route: {customer.route.name}</div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-50">
          <a href={`tel:${customer.contact}`} className="flex items-center justify-center gap-2 w-full py-4 bg-slate-100 text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-colors">
            <Phone className="h-5 w-5" />
            CALL CUSTOMER
          </a>
          
          <VisitWorkflow customerId={customer.id} />
          
          {/* Quick Payment Button outside of Visit workflow for convenience */}
          <button className="mt-3 w-full py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">
            COLLECT PAYMENT ONLY
          </button>
        </div>
      </div>
    </div>
  );
}

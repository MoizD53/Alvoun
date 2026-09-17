import { getCustomerDetail } from '@/lib/actions/salesman/customer';
import Link from 'next/link';
import { ArrowLeft, Phone, MapPin, Navigation, IndianRupee } from 'lucide-react';
import VisitWorkflow from './VisitWorkflow';
import { notFound } from 'next/navigation';
import { formatMoney } from '@/lib/format';

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

  const outstandingMoney = formatMoney(Math.abs(customer.outstanding));

  return (
    <div className="space-y-6 pb-24 animate-fade-in-up">
      {/* Top Nav */}
      <div className="flex items-center gap-4 bg-slate-50 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20">
        <Link href="/dashboard/salesman/customers" className="p-2.5 bg-white rounded-full shadow-sm border border-slate-200 text-slate-700 active:bg-slate-50 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900 truncate flex-1">{customer.customerName}</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center items-center text-center">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Outstanding Balance</div>
          <div className={`text-4xl font-black ${customer.outstanding > 0 ? 'text-alvoun-red' : (customer.outstanding < 0 ? 'text-alvoun-green' : 'text-slate-900')}`}>
            {outstandingMoney}
            {customer.outstanding !== 0 && (
              <span className="text-xl font-bold ml-1">{customer.outstanding > 0 ? 'Dr' : 'Cr'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
             <Phone className="h-5 w-5 text-alvoun-blue" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-slate-900 text-lg">{customer.contact}</div>
            <div className="text-sm font-medium text-slate-500">Contact Number</div>
          </div>
        </div>
        
        <div className="flex items-start gap-4 pt-6 border-t border-slate-100">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
             <MapPin className="h-5 w-5 text-alvoun-blue" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-slate-900 text-base leading-snug mb-1">{customer.address}</div>
            <div className="text-sm font-medium text-slate-500">{customer.city.name}, {customer.state.name}</div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600 mt-2">
              <Navigation className="h-3 w-3" />
              {customer.route.name}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        <a href={`tel:${customer.contact}`} className="flex items-center justify-center gap-2 w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold active:bg-slate-50 transition-colors shadow-sm text-base">
          <Phone className="h-5 w-5 text-slate-400" />
          CALL CUSTOMER
        </a>
        
        <VisitWorkflow customerId={customer.id} />
        
        <Link 
          href={`/dashboard/salesman/customers/${customer.id}/payment`}
          className="flex items-center justify-center gap-2 w-full py-4 bg-alvoun-green/10 text-alvoun-green border border-alvoun-green/20 rounded-xl font-bold active:bg-alvoun-green/20 transition-colors shadow-sm text-base"
        >
          <IndianRupee className="h-5 w-5" />
          COLLECT PAYMENT
        </Link>
      </div>
    </div>
  );
}

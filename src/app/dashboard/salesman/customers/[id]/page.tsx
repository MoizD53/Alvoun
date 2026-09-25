import { getCustomerDetail } from '@/lib/actions/salesman/customer';
import Link from 'next/link';
import { ArrowLeft, MapPin, Navigation, IndianRupee, Check, Eye } from 'lucide-react';
import PhoneManager from './PhoneManager';
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
      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20">
        <Link href="/dashboard/salesman/customers" className="p-2.5 bg-white dark:bg-slate-950 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-900 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate flex-1">{customer.customerName}</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-center items-center text-center">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Dues Balance</div>
          <div className={`text-4xl font-black ${customer.outstanding > 0 ? 'text-alvoun-red' : (customer.outstanding < 0 ? 'text-alvoun-green' : 'text-slate-900 dark:text-slate-100')}`}>
            {outstandingMoney}
            {customer.outstanding !== 0 && (
              <span className="text-xl font-bold ml-1">{customer.outstanding > 0 ? 'Dr' : 'Cr'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
        <PhoneManager customerId={customer.id} initialPhone={customer.contact} />
        
        <div className="flex items-start gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
             <MapPin className="h-5 w-5 text-alvoun-blue" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug mb-1">{customer.address}</div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{customer.city.name}, {customer.state.name}</div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-bold text-slate-600 dark:text-slate-400 mt-2">
              <Navigation className="h-3 w-3" />
              {customer.route.name}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        {customer.isVisitedToday ? (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-500/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-md">
                <Check className="h-3.5 w-3.5" /> VISITED TODAY
              </span>
              <span className="text-xs text-slate-500">{customer.todayVisit?.formattedTime}</span>
            </div>
            {customer.todayVisit?.isNoSale ? (
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Visit completed • No sale ({customer.todayVisit.noSaleReason || 'No sale'})
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold pt-1 border-t border-emerald-100 dark:border-emerald-900/30">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Sale</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{formatMoney(customer.todayVisit?.saleAmount || 0)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Received</span>
                  <p className="font-bold text-alvoun-green">{formatMoney(customer.todayVisit?.receivedAmount || 0)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Due</span>
                  <p className="font-bold text-alvoun-red">{formatMoney(customer.todayVisit?.dueFromSale || 0)}</p>
                </div>
              </div>
            )}
            <Link 
              href={`/dashboard/salesman/customers/${customer.id}/visit`}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-sm transition-colors"
            >
              <Eye className="h-4 w-4" />
              VIEW VISIT DETAILS
            </Link>
          </div>
        ) : (
          <Link 
            href={`/dashboard/salesman/customers/${customer.id}/visit`}
            className="flex items-center justify-center gap-2 w-full py-4 bg-alvoun-blue text-white rounded-xl font-black text-lg shadow-lg shadow-alvoun-blue/20 hover:bg-alvoun-dark active:bg-alvoun-dark transition-colors"
          >
            START VISIT
          </Link>
        )}
        
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

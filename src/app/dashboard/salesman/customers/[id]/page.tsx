import { getCustomerDetail } from '@/lib/actions/salesman/customer';
import Link from 'next/link';
import { ArrowLeft, MapPin, Navigation, IndianRupee, Check, Eye, ShoppingBag } from 'lucide-react';
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
    <div className="space-y-6 pb-28 animate-fade-in-up">
      {/* Top Nav */}
      <div className="flex items-center gap-3 bg-surface/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20 border-b border-border-subtle/40">
        <Link 
          href="/dashboard/salesman/customers" 
          className="w-10 h-10 flex items-center justify-center bg-surface-raised rounded-2xl shadow-raised-sm border border-border-subtle text-text-primary active:shadow-inset active:scale-95 transition-all"
          aria-label="Back to customers"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-black text-text-primary truncate flex-1 tracking-tight">
          {customer.customerName}
        </h1>
      </div>

      {/* Dues Balance Card */}
      <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle p-6 flex flex-col justify-center items-center text-center">
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
          Dues Balance
        </div>
        <div className={`text-4xl font-black tracking-tight ${
          customer.outstanding > 0 
            ? 'text-accent-terracotta' 
            : (customer.outstanding < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-primary')
        }`}>
          {outstandingMoney}
          {customer.outstanding !== 0 && (
            <span className="text-lg font-bold ml-1.5 uppercase">{customer.outstanding > 0 ? 'Dr' : 'Cr'}</span>
          )}
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle p-6 space-y-6">
        <PhoneManager customerId={customer.id} initialPhone={customer.contact} />
        
        <div className="flex items-start gap-4 pt-6 border-t border-border-subtle">
          <div className="w-11 h-11 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-brand-teal" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-text-primary text-base leading-snug mb-1">
              {customer.address}
            </div>
            <div className="text-sm font-medium text-text-muted">
              {customer.city.name}, {customer.state.name}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-sunken shadow-inset-sm rounded-full text-xs font-bold text-text-secondary mt-3 border border-border-subtle">
              <Navigation className="h-3.5 w-3.5 text-brand-teal" />
              {customer.route?.name || customer.city.name}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        {customer.isVisitedToday ? (
          <div className="p-5 bg-surface-raised shadow-raised border-2 border-emerald-500/30 rounded-3xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full shadow-raised-sm">
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> VISITED TODAY
              </span>
              <span className="text-xs font-semibold text-text-muted">{customer.todayVisit?.formattedTime}</span>
            </div>
            {customer.todayVisit?.isNoSale ? (
              <p className="text-xs font-bold text-text-secondary bg-surface-sunken p-3 rounded-xl border border-border-subtle">
                Visit completed • No sale ({customer.todayVisit.noSaleReason || 'No sale'})
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold p-3 bg-surface-sunken shadow-inset rounded-2xl border border-border-subtle">
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block">Sale</span>
                  <p className="font-black text-text-primary">{formatMoney(customer.todayVisit?.saleAmount || 0)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block">Received</span>
                  <p className="font-black text-emerald-600 dark:text-emerald-400">{formatMoney(customer.todayVisit?.receivedAmount || 0)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block">Due</span>
                  <p className="font-black text-accent-terracotta">{formatMoney(customer.todayVisit?.dueFromSale || 0)}</p>
                </div>
              </div>
            )}
            <Link 
              href={`/dashboard/salesman/customers/${customer.id}/visit`}
              className="flex items-center justify-center gap-2 w-full min-h-[48px] py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 rounded-2xl font-bold text-sm shadow-raised-sm active:shadow-inset transition-all"
            >
              <Eye className="h-4 w-4" />
              VIEW VISIT DETAILS
            </Link>
          </div>
        ) : (
          <Link 
            href={`/dashboard/salesman/customers/${customer.id}/visit`}
            className="flex items-center justify-center gap-2 w-full min-h-[52px] py-4 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-black text-base shadow-raised hover:shadow-raised-hover active:scale-[0.98] transition-all tracking-wide"
          >
            <ShoppingBag className="h-5 w-5" />
            START VISIT
          </Link>
        )}
        
        <Link 
          href={`/dashboard/salesman/customers/${customer.id}/payment`}
          className="flex items-center justify-center gap-2 w-full min-h-[52px] py-4 bg-surface-raised shadow-raised-sm hover:shadow-raised active:shadow-inset border border-brand-teal/30 text-brand-teal rounded-2xl font-black text-base active:scale-[0.98] transition-all"
        >
          <IndianRupee className="h-5 w-5" />
          COLLECT PAYMENT
        </Link>
      </div>
    </div>
  );
}

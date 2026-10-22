import { getCustomerDetail } from '@/lib/actions/salesman/customer';
import Link from 'next/link';
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  IndianRupee, 
  Check, 
  Eye, 
  ShoppingBag, 
  Receipt, 
  Calendar, 
  CreditCard, 
  History 
} from 'lucide-react';
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
  const customerCode = `CUST-${customer.id.slice(-4).toUpperCase()}`;

  const recentSales = customer.sales?.slice(0, 5) || [];
  const recentPayments = customer.payments?.slice(0, 5) || [];

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
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-text-primary truncate tracking-tight">
            {customer.customerName}
          </h1>
          <span className="text-[11px] font-mono font-bold text-text-muted">{customerCode}</span>
        </div>
      </div>

      {/* Dues Balance Card */}
      <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle p-6 flex flex-col justify-center items-center text-center">
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
          Current Dues Balance
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
              {customer.city?.name}, {customer.state?.name}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-sunken shadow-inset-sm rounded-full text-xs font-bold text-text-secondary mt-3 border border-border-subtle">
              <Navigation className="h-3.5 w-3.5 text-brand-teal" />
              {customer.route?.name || customer.city?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
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
        
        {/* Prominent Receipt / Collect Payment Action */}
        <Link 
          href={`/dashboard/salesman/customers/${customer.id}/payment`}
          className="flex items-center justify-center gap-2 w-full min-h-[52px] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base shadow-raised active:scale-[0.98] transition-all"
        >
          <Receipt className="h-5 w-5" />
          RECEIPT / COLLECT PAYMENT
        </Link>
      </div>

      {/* Recent History: Sales & Collections */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <History className="h-4 w-4 text-brand-teal" />
            Recent Activity & History
          </h3>
        </div>

        {/* Recent Payments Section */}
        <div className="bg-surface-raised p-5 rounded-3xl shadow-raised border border-border-subtle space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Recent Collections ({recentPayments.length})
            </span>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-xs text-text-muted py-2 text-center">No payment collections recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((p: any) => (
                <div key={p.id} className="p-3 bg-surface-sunken rounded-xl shadow-inset border border-border-subtle flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-foreground">{formatMoney(p.amount)}</span>
                    <span className="text-[11px] text-text-muted ml-2">via {p.paymentMethod}</span>
                    {p.referenceNumber && (
                      <div className="text-[10px] text-text-muted font-mono">{p.referenceNumber}</div>
                    )}
                  </div>
                  <div className="text-right text-[11px] text-text-muted font-medium">
                    {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sales Section */}
        <div className="bg-surface-raised p-5 rounded-3xl shadow-raised border border-border-subtle space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-brand-teal" />
              Recent Sales Orders ({recentSales.length})
            </span>
          </div>
          {recentSales.length === 0 ? (
            <p className="text-xs text-text-muted py-2 text-center">No sales orders recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map((s: any) => (
                <div key={s.id} className="p-3 bg-surface-sunken rounded-xl shadow-inset border border-border-subtle flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-foreground">{formatMoney(s.totalAmount)}</span>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      {s.items?.map((it: any) => `${it.crates}x ${it.product?.name || 'pkg'}`).join(', ')}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-text-muted font-medium">
                    {new Date(s.saleDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

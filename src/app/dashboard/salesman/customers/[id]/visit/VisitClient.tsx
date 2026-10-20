'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import { submitVisitFlow } from '@/lib/actions/salesman/visitFlow';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Minus, 
  Plus, 
  ShoppingBag, 
  AlertTriangle, 
  Check, 
  Banknote, 
  QrCode,
  Loader2,
  Clock
} from 'lucide-react';

type Step = 'START' | 'ORDER' | 'PAYMENT' | 'SUCCESS';

export default function VisitClient({ customer, products = [] }: { customer: any, products?: any[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('START');
  const [isNoSale, setIsNoSale] = useState(false);
  const [noSaleReason, setNoSaleReason] = useState('Shop Closed');
  
  // Order State: productId -> crates
  const [order, setOrder] = useState<Record<string, number>>({});
  
  // Payment State: separate Cash and UPI
  const [cashReceivedStr, setCashReceivedStr] = useState<string>('');
  const [upiReceivedStr, setUpiReceivedStr] = useState<string>('');
  
  // Form status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeProducts = Array.isArray(products) ? products : [];

  // Computed
  const orderItems = safeProducts.map(p => {
    const crates = order[p.id] || 0;
    const rates = Array.isArray(p.rates) ? p.rates : [];
    const applicableRate = rates.find((r: any) => crates >= r.minQuantity) || rates[rates.length - 1];
    const rateToUse = applicableRate ? applicableRate.rate : 0;
    const amount = crates * rateToUse;
    return { ...p, crates, rateToUse, amount };
  }).filter(p => p.crates > 0);

  const totalSaleAmount = orderItems.reduce((sum, item) => sum + item.amount, 0);
  const cashReceivedCents = cashReceivedStr ? Math.round(parseFloat(cashReceivedStr) * 100) : 0;
  const upiReceivedCents = upiReceivedStr ? Math.round(parseFloat(upiReceivedStr) * 100) : 0;
  const totalReceivedCents = cashReceivedCents + upiReceivedCents;
  const dueFromSale = Math.max(0, totalSaleAmount - totalReceivedCents);
  const currentOutstanding = customer?.outstanding ?? 0;
  const finalOutstanding = currentOutstanding + dueFromSale;

  const handleCrateChange = (productId: string, delta: number) => {
    setOrder(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const handleComplete = async (isNoSaleFlow: boolean = false) => {
    setLoading(true);
    setError(null);
    
    if (!isNoSaleFlow && totalReceivedCents > totalSaleAmount) {
      setError("Total received amount (Cash + UPI) cannot exceed today's sale amount.");
      setLoading(false);
      return;
    }

    const payload = {
      customerId: customer.id,
      isNoSale: isNoSaleFlow,
      noSaleReason: isNoSaleFlow ? noSaleReason : undefined,
      items: isNoSaleFlow ? [] : orderItems.map(i => ({ productId: i.id, crates: i.crates })),
      receivedNow: isNoSaleFlow ? 0 : totalReceivedCents,
      cashReceived: isNoSaleFlow ? 0 : cashReceivedCents,
      upiReceived: isNoSaleFlow ? 0 : upiReceivedCents
    };

    const res = await submitVisitFlow(payload);
    
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setStep('SUCCESS');
      setLoading(false);
    }
  };

  // ALREADY VISITED TODAY VIEW
  if (customer.isVisitedToday && step === 'START') {
    const visit = customer.todayVisit;
    return (
      <div className="space-y-6 pb-28 animate-fade-in-up">
        <div className="flex items-center gap-3 bg-surface/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20 border-b border-border-subtle/40">
          <Link 
            href={customer.routeId ? `/dashboard/salesman/customers?routeId=${customer.routeId}` : '/dashboard/salesman/customers'}
            className="w-10 h-10 flex items-center justify-center bg-surface-raised rounded-2xl shadow-raised-sm border border-border-subtle text-text-primary active:shadow-inset active:scale-95 transition-all"
            aria-label="Back to customers"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-text-primary tracking-tight">{customer.customerName}</h1>
            <p className="text-xs text-text-muted font-semibold">{customer.route?.name}</p>
          </div>
        </div>

        <div className="p-6 bg-surface-raised rounded-3xl border-2 border-emerald-500/30 shadow-raised space-y-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full shadow-raised-sm">
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> VISITED TODAY
            </span>
            <span className="text-xs font-semibold text-text-muted flex items-center gap-1">
              <Clock className="h-3 w-3 text-brand-teal" />
              {visit?.formattedTime || 'Today'}
            </span>
          </div>

          {visit?.isNoSale ? (
            <div className="p-4 bg-surface-sunken shadow-inset rounded-2xl text-center space-y-1 border border-border-subtle">
              <p className="font-bold text-text-primary">No Sale Recorded</p>
              <p className="text-xs text-text-muted">Reason: {visit.noSaleReason || 'No sale'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visit?.items && visit.items.length > 0 && (
                <div className="bg-surface-sunken shadow-inset rounded-2xl p-4 space-y-2 text-xs border border-border-subtle">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Products Purchased</span>
                  {visit.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-border-subtle/50 last:border-0">
                      <span className="font-medium text-text-secondary">{item.productName} ({item.crates} crates)</span>
                      <span className="font-black text-text-primary">{formatMoney(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-surface-sunken shadow-inset rounded-2xl space-y-2 text-xs font-medium border border-border-subtle">
                <div className="flex justify-between text-text-muted">
                  <span>Sale Total</span>
                  <span className="font-bold text-text-primary">{formatMoney(visit?.saleAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Payment Received</span>
                  <span className="font-bold">-{formatMoney(visit?.receivedAmount || 0)}</span>
                </div>
                <div className="pt-2 border-t border-border-subtle flex justify-between font-bold">
                  <span className="text-text-primary">Due from this sale</span>
                  <span className="text-accent-terracotta font-black">{formatMoney(visit?.dueFromSale || 0)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-surface-sunken/60 rounded-2xl border border-border-subtle flex justify-between items-center text-xs">
            <span className="font-bold text-text-muted uppercase">Customer Outstanding</span>
            <span className="font-black text-base text-text-primary">{formatMoney(Math.abs(customer.outstanding))}</span>
          </div>

          <Link
            href={customer.routeId ? `/dashboard/salesman/customers?routeId=${customer.routeId}` : '/dashboard/salesman/customers'}
            className="w-full min-h-[48px] py-3.5 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-bold text-sm flex items-center justify-center transition-all shadow-raised active:scale-[0.98]"
          >
            BACK TO CUSTOMERS
          </Link>
        </div>
      </div>
    );
  }

  // 1. START VISIT SCREEN
  if (step === 'START') {
    return (
      <div className="space-y-6 pb-28 animate-fade-in-up">
        <div className="flex items-center gap-3 bg-surface/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20 border-b border-border-subtle/40">
          <Link 
            href={customer.routeId ? `/dashboard/salesman/customers?routeId=${customer.routeId}` : '/dashboard/salesman/customers'}
            className="w-10 h-10 flex items-center justify-center bg-surface-raised rounded-2xl shadow-raised-sm border border-border-subtle text-text-primary active:shadow-inset active:scale-95 transition-all"
            aria-label="Back to customers"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-black text-text-primary tracking-tight">Start Visit</h1>
        </div>

        <div className="bg-surface-raised p-6 rounded-3xl shadow-raised border border-border-subtle text-center">
          <div className="w-16 h-16 bg-surface-sunken shadow-inset border border-border-subtle rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-teal">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-text-primary mb-1">{customer.customerName}</h2>
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-6">
            {customer?.route?.name || customer?.address || 'Assigned Route'}
          </p>
          
          <div className="bg-surface-sunken shadow-inset rounded-2xl p-4 mb-6 border border-border-subtle">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Current Outstanding</p>
            <p className={`text-2xl font-black ${currentOutstanding > 0 ? 'text-accent-terracotta' : 'text-text-primary'}`}>
              {formatMoney(currentOutstanding)}
            </p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => setStep('ORDER')}
              className="w-full min-h-[52px] py-4 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-black text-base shadow-raised active:scale-[0.98] transition-all tracking-wide"
            >
              TAKE ORDER
            </button>
            <button 
              onClick={() => setIsNoSale(true)}
              className="w-full min-h-[48px] py-3.5 bg-surface-raised shadow-raised-sm hover:shadow-raised border border-border-subtle text-text-secondary rounded-2xl font-bold text-sm active:scale-[0.98] transition-all"
            >
              NO SALE TODAY
            </button>
          </div>
        </div>

        {isNoSale && (
          <div className="bg-surface-raised p-6 rounded-3xl shadow-raised border border-border-subtle animate-fade-in-up space-y-4">
            <h3 className="font-bold text-text-primary text-base">Reason for no sale:</h3>
            <select 
              value={noSaleReason}
              onChange={(e) => setNoSaleReason(e.target.value)}
              className="w-full p-4 bg-surface-sunken shadow-inset border border-border-subtle rounded-2xl text-base font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
            >
              <option>Shop Closed</option>
              <option>Sufficient Stock</option>
              <option>Owner Unavailable</option>
              <option>Payment Pending</option>
            </select>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-accent-terracotta rounded-xl font-bold text-xs text-center">
                {error}
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <button 
                disabled={loading}
                onClick={() => handleComplete(true)}
                className="flex-1 min-h-[48px] py-3 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-bold text-sm shadow-raised disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'COMPLETE VISIT - NO SALE'}
              </button>
              <button 
                type="button"
                onClick={() => setIsNoSale(false)}
                className="min-h-[48px] px-5 py-3 bg-surface-raised shadow-raised-sm border border-border-subtle text-text-secondary rounded-2xl font-bold text-sm active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. ORDER SCREEN
  if (step === 'ORDER') {
    return (
      <div className="space-y-4 pb-44 animate-fade-in-up">
        <div className="flex items-center gap-3 bg-surface/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20 border-b border-border-subtle/40">
          <button 
            onClick={() => setStep('START')} 
            className="w-10 h-10 flex items-center justify-center bg-surface-raised rounded-2xl shadow-raised-sm border border-border-subtle text-text-primary active:shadow-inset active:scale-95 transition-all"
            aria-label="Back to step 1"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-black text-text-primary tracking-tight">Take Order</h2>
            <p className="text-xs text-text-muted font-semibold">{customer.customerName}</p>
          </div>
        </div>

        <div className="space-y-3">
          {safeProducts.map(p => (
            <div key={p.id} className="bg-surface-raised p-5 rounded-3xl shadow-raised border border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-text-primary mb-1">{p.name}</h3>
                <p className="text-xs font-semibold text-text-muted">{p.bottlesPerCrate} bottles / crate</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleCrateChange(p.id, -1)}
                  className="w-11 h-11 flex items-center justify-center bg-surface-sunken shadow-inset text-text-primary rounded-xl active:scale-95 border border-border-subtle transition-all"
                  aria-label="Decrease crate count"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="text-xl font-black w-8 text-center text-text-primary">{order[p.id] || 0}</span>
                <button 
                  onClick={() => handleCrateChange(p.id, 1)}
                  className="w-11 h-11 flex items-center justify-center bg-brand-teal hover:bg-brand-teal-dark text-white rounded-xl shadow-raised active:scale-95 transition-all"
                  aria-label="Increase crate count"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Summary */}
        <div className="fixed bottom-[74px] sm:bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-md border-t border-border-subtle p-4 shadow-raised-lg z-40">
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex justify-between items-end px-1">
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Total Amount</p>
                <p className="text-2xl font-black text-brand-teal">{formatMoney(totalSaleAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Total Crates</p>
                <p className="text-xl font-black text-text-primary">
                  {orderItems.reduce((acc, curr) => acc + curr.crates, 0)}
                </p>
              </div>
            </div>
            <button 
              disabled={totalSaleAmount === 0}
              onClick={() => setStep('PAYMENT')}
              className="w-full min-h-[50px] py-3.5 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-black text-base shadow-raised active:scale-[0.98] disabled:opacity-50 transition-all tracking-wide"
            >
              CONTINUE TO PAYMENT
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. PAYMENT SCREEN
  if (step === 'PAYMENT') {
    return (
      <div className="space-y-6 pb-36 animate-fade-in-up">
        <div className="flex items-center gap-3 bg-surface/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20 border-b border-border-subtle/40">
          <button 
            onClick={() => setStep('ORDER')} 
            className="w-10 h-10 flex items-center justify-center bg-surface-raised rounded-2xl shadow-raised-sm border border-border-subtle text-text-primary active:shadow-inset active:scale-95 transition-all"
            aria-label="Back to order"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-black text-text-primary tracking-tight">Payment</h2>
            <p className="text-xs text-text-muted font-semibold">{customer.customerName}</p>
          </div>
        </div>

        <div className="bg-linear-to-br from-brand-teal-dark via-brand-teal to-slate-900 text-white p-6 rounded-3xl shadow-raised-md space-y-4">
          <div>
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider mb-1">Total Sale Today</p>
            <p className="text-4xl font-black tracking-tight">{formatMoney(totalSaleAmount)}</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Cash Input */}
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/15 shadow-inset">
              <div className="flex items-center gap-2 mb-2 text-emerald-300">
                <Banknote className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Cash Collected (₹)</span>
              </div>
              <input 
                type="number" 
                inputMode="decimal"
                placeholder="0"
                value={cashReceivedStr}
                onChange={(e) => setCashReceivedStr(e.target.value)}
                className="w-full bg-transparent text-2xl font-black text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            {/* UPI Input */}
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/15 shadow-inset">
              <div className="flex items-center gap-2 mb-2 text-sky-300">
                <QrCode className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">UPI Collected (₹)</span>
              </div>
              <input 
                type="number" 
                inputMode="decimal"
                placeholder="0"
                value={upiReceivedStr}
                onChange={(e) => setUpiReceivedStr(e.target.value)}
                className="w-full bg-transparent text-2xl font-black text-white placeholder-white/30 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-raised p-6 rounded-3xl shadow-raised border border-border-subtle space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-text-muted">Previous Outstanding</span>
            <span className="font-black text-text-primary">{formatMoney(currentOutstanding)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-text-muted">Today&apos;s Sale</span>
            <span className="font-black text-text-primary">+{formatMoney(totalSaleAmount)}</span>
          </div>

          {/* Breakdown if entered */}
          {cashReceivedCents > 0 && (
            <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400">
              <span className="font-semibold flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> Cash Collected</span>
              <span className="font-black">-{formatMoney(cashReceivedCents)}</span>
            </div>
          )}
          {upiReceivedCents > 0 && (
            <div className="flex justify-between items-center text-sm text-sky-600 dark:text-sky-400">
              <span className="font-semibold flex items-center gap-1.5"><QrCode className="h-3.5 w-3.5" /> UPI Collected</span>
              <span className="font-black">-{formatMoney(upiReceivedCents)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm text-emerald-700 dark:text-emerald-300 font-bold pt-2 border-t border-dashed border-border-subtle">
            <span>Total Collected Now</span>
            <span className="font-black">-{formatMoney(totalReceivedCents)}</span>
          </div>

          <div className="pt-3 border-t border-border-subtle flex justify-between items-center">
            <div>
              <span className="text-xs font-black text-text-primary uppercase tracking-wider block">New Total Outstanding</span>
              <span className="text-[11px] text-text-muted font-medium">(Auto calculated)</span>
            </div>
            <span className="text-2xl font-black text-accent-terracotta">{formatMoney(finalOutstanding)}</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-accent-terracotta rounded-2xl font-bold text-sm text-center flex items-center justify-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="fixed bottom-[74px] sm:bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-md border-t border-border-subtle p-4 shadow-raised-lg z-40">
          <div className="max-w-md mx-auto">
            <button 
              disabled={loading}
              onClick={() => handleComplete(false)}
              className="w-full min-h-[52px] py-3.5 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-black text-base shadow-raised active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 tracking-wide"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'COMPLETE VISIT'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. SUCCESS SCREEN
  if (step === 'SUCCESS') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] text-center px-4 animate-fade-in-up">
        <div className="w-24 h-24 bg-emerald-500/15 border-2 border-emerald-500/30 rounded-3xl flex items-center justify-center mb-6 shadow-raised">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl font-black text-text-primary mb-2 tracking-tight">Visit Completed</h1>
        <p className="text-lg font-bold text-text-muted mb-8">{customer.customerName}</p>
        
        {!isNoSale && (
          <div className="w-full max-w-sm bg-surface-raised p-6 rounded-3xl shadow-raised border border-border-subtle mb-8 text-left space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-text-muted">Sale</span>
              <span className="text-base font-black text-text-primary">{formatMoney(totalSaleAmount)}</span>
            </div>
            {cashReceivedCents > 0 && (
              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                <span className="text-sm font-semibold flex items-center gap-1.5"><Banknote className="h-4 w-4" /> Cash</span>
                <span className="text-base font-black">{formatMoney(cashReceivedCents)}</span>
              </div>
            )}
            {upiReceivedCents > 0 && (
              <div className="flex justify-between items-center text-sky-600 dark:text-sky-400">
                <span className="text-sm font-semibold flex items-center gap-1.5"><QrCode className="h-4 w-4" /> UPI</span>
                <span className="text-base font-black">{formatMoney(upiReceivedCents)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
              <span className="text-sm font-bold text-text-muted">Total Received</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{formatMoney(totalReceivedCents)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-text-muted">New Due from Sale</span>
              <span className="text-base font-black text-accent-terracotta">{formatMoney(dueFromSale)}</span>
            </div>
          </div>
        )}

        <button 
          onClick={() => {
            router.push(customer.routeId ? `/dashboard/salesman/customers?routeId=${customer.routeId}` : '/dashboard/salesman/customers');
            router.refresh();
          }}
          className="w-full max-w-sm min-h-[50px] py-3.5 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-black text-base shadow-raised active:scale-95 transition-all tracking-wide"
        >
          DONE
        </button>
      </div>
    );
  }

  return null;
}

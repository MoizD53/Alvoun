'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import { submitVisitFlow } from '@/lib/actions/salesman/visitFlow';
import { ArrowLeft, Box, CheckCircle2, Minus, Plus, ShoppingBag, XCircle, AlertTriangle, Check } from 'lucide-react';

type Step = 'START' | 'ORDER' | 'PAYMENT' | 'SUCCESS';

export default function VisitClient({ customer, products = [] }: { customer: any, products?: any[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('START');
  const [isNoSale, setIsNoSale] = useState(false);
  const [noSaleReason, setNoSaleReason] = useState('Shop Closed');
  
  // Order State: productId -> crates
  const [order, setOrder] = useState<Record<string, number>>({});
  
  // Payment State
  const [receivedNowStr, setReceivedNowStr] = useState<string>('');
  
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
  const receivedNowCents = receivedNowStr ? Math.round(parseFloat(receivedNowStr) * 100) : 0;
  const dueFromSale = Math.max(0, totalSaleAmount - receivedNowCents);
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
    
    if (!isNoSaleFlow && receivedNowCents > totalSaleAmount) {
      setError("Received amount cannot exceed today's sale amount.");
      setLoading(false);
      return;
    }

    const payload = {
      customerId: customer.id,
      isNoSale: isNoSaleFlow,
      noSaleReason: isNoSaleFlow ? noSaleReason : undefined,
      items: isNoSaleFlow ? [] : orderItems.map(i => ({ productId: i.id, crates: i.crates })),
      receivedNow: isNoSaleFlow ? 0 : receivedNowCents
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
      <div className="space-y-6 pb-20 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <Link 
            href={customer.routeId ? `/dashboard/salesman/customers?routeId=${customer.routeId}` : '/dashboard/salesman/customers'}
            className="p-2.5 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">{customer.customerName}</h1>
            <p className="text-xs text-slate-500 font-semibold">{customer.route?.name}</p>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-950 rounded-2xl border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1 rounded-md">
              <Check className="h-3.5 w-3.5" /> VISITED TODAY
            </span>
            <span className="text-xs font-semibold text-slate-500">{visit?.formattedTime || 'Today'}</span>
          </div>

          {visit?.isNoSale ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-center space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200">No Sale Recorded</p>
              <p className="text-xs text-slate-500">Reason: {visit.noSaleReason || 'No sale'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visit?.items && visit.items.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Products Purchased</span>
                  {visit.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{item.productName} ({item.crates} crates)</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{formatMoney(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1.5 text-xs font-medium">
                <div className="flex justify-between text-slate-500">
                  <span>Sale Total</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatMoney(visit?.saleAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Payment Received</span>
                  <span className="font-bold">-{formatMoney(visit?.receivedAmount || 0)}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold">
                  <span>Due from this sale</span>
                  <span className="text-alvoun-red font-black">{formatMoney(visit?.dueFromSale || 0)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-100/70 dark:bg-slate-900/50 rounded-xl flex justify-between items-center text-xs">
            <span className="font-bold text-slate-500 uppercase">Customer Outstanding</span>
            <span className="font-black text-base text-slate-900 dark:text-slate-100">{formatMoney(Math.abs(customer.outstanding))}</span>
          </div>

          <Link
            href={customer.routeId ? `/dashboard/salesman/customers?routeId=${customer.routeId}` : '/dashboard/salesman/customers'}
            className="w-full py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold text-sm flex items-center justify-center transition-colors"
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
      <div className="space-y-6 pb-20 animate-fade-in-up">
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-16 h-16 bg-alvoun-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="h-8 w-8 text-alvoun-blue" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">{customer.customerName}</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">{customer?.route?.name || customer?.address || 'Assigned Route'}</p>
          
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Outstanding</p>
            <p className="text-2xl font-black text-alvoun-red">{formatMoney(currentOutstanding)}</p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => setStep('ORDER')}
              className="w-full py-4 bg-alvoun-blue text-white rounded-xl font-black text-lg shadow-lg shadow-alvoun-blue/20 active:bg-alvoun-dark transition-colors"
            >
              TAKE ORDER
            </button>
            <button 
              onClick={() => setIsNoSale(true)}
              className="w-full py-4 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-base active:bg-slate-200 dark:active:bg-slate-800 transition-colors"
            >
              NO SALE TODAY
            </button>
          </div>
        </div>

        {isNoSale && (
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in-up">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Reason for no sale:</h3>
            <select 
              value={noSaleReason}
              onChange={(e) => setNoSaleReason(e.target.value)}
              className="w-full p-4 mb-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-lg font-medium"
            >
              <option>Shop Closed</option>
              <option>Sufficient Stock</option>
              <option>Owner Unavailable</option>
              <option>Payment Pending</option>
            </select>
            
            {error && <p className="text-red-500 font-bold mb-4 text-center">{error}</p>}
            
            <button 
              disabled={loading}
              onClick={() => handleComplete(true)}
              className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-black text-lg shadow-lg disabled:opacity-50 transition-colors"
            >
              {loading ? 'SAVING...' : 'COMPLETE VISIT - NO SALE'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. ORDER SCREEN
  if (step === 'ORDER') {
    return (
      <div className="space-y-4 pb-[180px] animate-fade-in-up">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep('START')} className="p-2 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Take Order</h2>
        </div>

        {safeProducts.map(p => (
          <div key={p.id} className="bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-1">{p.name}</h3>
              <p className="text-sm font-bold text-slate-500">{p.bottlesPerCrate} bottles / crate</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handleCrateChange(p.id, -1)}
                className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl active:bg-slate-200"
              >
                <Minus className="h-6 w-6" />
              </button>
              <span className="text-2xl font-black w-8 text-center">{order[p.id] || 0}</span>
              <button 
                onClick={() => handleCrateChange(p.id, 1)}
                className="w-12 h-12 flex items-center justify-center bg-alvoun-blue text-white rounded-xl active:bg-alvoun-dark"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>
          </div>
        ))}

        {/* Sticky Summary */}
        <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Amount</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{formatMoney(totalSaleAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Crates</p>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100">
                {orderItems.reduce((acc, curr) => acc + curr.crates, 0)}
              </p>
            </div>
          </div>
          <button 
            disabled={totalSaleAmount === 0}
            onClick={() => setStep('PAYMENT')}
            className="w-full py-4 bg-alvoun-blue text-white rounded-xl font-black text-lg shadow-lg shadow-alvoun-blue/20 active:bg-alvoun-dark disabled:opacity-50 disabled:shadow-none transition-all"
          >
            CONTINUE TO PAYMENT
          </button>
        </div>
      </div>
    );
  }

  // 3. PAYMENT SCREEN
  if (step === 'PAYMENT') {
    return (
      <div className="space-y-6 pb-[120px] animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setStep('ORDER')} className="p-2 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Payment</h2>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Sale Today</p>
          <p className="text-4xl font-black mb-6">{formatMoney(totalSaleAmount)}</p>
          
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Received Now (₹)</p>
            <input 
              type="number" 
              inputMode="decimal"
              placeholder="0"
              value={receivedNowStr}
              onChange={(e) => setReceivedNowStr(e.target.value)}
              className="w-full bg-transparent text-3xl font-black placeholder-white/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-500">Previous Outstanding</span>
            <span className="text-base font-black text-slate-900 dark:text-slate-100">{formatMoney(currentOutstanding)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-500">Today's Sale</span>
            <span className="text-base font-black text-slate-900 dark:text-slate-100">+{formatMoney(totalSaleAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-alvoun-green">
            <span className="text-sm font-bold">Received Now</span>
            <span className="text-base font-black">-{formatMoney(receivedNowCents)}</span>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Total Outstanding</span>
            <span className="text-2xl font-black text-alvoun-red">{formatMoney(finalOutstanding)}</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm text-center border border-red-200 dark:border-red-800">
            <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
            {error}
          </div>
        )}

        <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50">
          <button 
            disabled={loading}
            onClick={() => handleComplete(false)}
            className="w-full py-4 bg-alvoun-blue text-white rounded-xl font-black text-lg shadow-lg shadow-alvoun-blue/20 active:bg-alvoun-dark disabled:opacity-50 transition-all"
          >
            {loading ? 'SAVING...' : 'COMPLETE VISIT'}
          </button>
        </div>
      </div>
    );
  }

  // 4. SUCCESS SCREEN
  if (step === 'SUCCESS') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 animate-fade-in-up">
        <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">Visit Completed</h1>
        <p className="text-lg font-bold text-slate-500 mb-8">{customer.customerName}</p>
        
        {!isNoSale && (
          <div className="w-full max-w-sm bg-white dark:bg-slate-950 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8 text-left space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500">Sale</span>
              <span className="text-base font-black text-slate-900 dark:text-slate-100">{formatMoney(totalSaleAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500">Received</span>
              <span className="text-base font-black text-alvoun-green">{formatMoney(receivedNowCents)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500">New Due from Sale</span>
              <span className="text-base font-black text-slate-900 dark:text-slate-100">{formatMoney(dueFromSale)}</span>
            </div>
          </div>
        )}

        <button 
          onClick={() => {
            router.push(customer.routeId ? `/dashboard/salesman/customers?routeId=${customer.routeId}` : '/dashboard/salesman/customers');
            router.refresh();
          }}
          className="w-full max-w-sm py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-black text-lg shadow-lg active:scale-95 transition-all"
        >
          DONE
        </button>
      </div>
    );
  }

  return null;
}

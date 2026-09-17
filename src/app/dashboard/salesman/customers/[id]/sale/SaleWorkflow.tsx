'use client';

import { useState, useMemo } from 'react';
import { createSale } from '@/lib/actions/salesman/sale';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ShoppingCart, Loader2, Minus, Plus, IndianRupee } from 'lucide-react';
import Link from 'next/link';
import { formatMoney } from '@/lib/format';

export default function SaleWorkflow({ 
  customer, 
  products 
}: { 
  customer: any, 
  products: any[] 
}) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [overrides, setOverrides] = useState<Record<string, number>>({}); // stores paise
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Calculate items and totals
  const cartItems = useMemo(() => {
    return products.map(product => {
      const crates = quantities[product.id] || 0;
      
      // Find applicable rate based on quantity
      const applicableRate = product.rates.find((r: any) => crates >= r.minQuantity) || product.rates[product.rates.length - 1];
      const standardRate = applicableRate ? applicableRate.rate : 0;
      
      const actualRate = overrides[product.id] !== undefined ? overrides[product.id] : standardRate;
      const amount = crates * actualRate;

      return {
        product,
        crates,
        bottles: crates * product.bottlesPerCrate,
        standardRate,
        actualRate,
        amount,
        hasOverride: overrides[product.id] !== undefined
      };
    }).filter(item => item.crates > 0);
  }, [quantities, overrides, products]);

  const totalAmount = cartItems.reduce((sum, item) => sum + item.amount, 0);
  const paymentAmountPaise = Math.round((parseFloat(paymentAmount) || 0) * 100);
  
  // Outstanding logic
  const originalOutstanding = customer.outstanding;
  const newOutstanding = originalOutstanding + totalAmount - paymentAmountPaise;

  const handleCrateChange = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const handleRateOverride = (productId: string, newRateStr: string) => {
    if (!newRateStr) {
      const newOverrides = { ...overrides };
      delete newOverrides[productId];
      setOverrides(newOverrides);
      return;
    }
    const val = parseFloat(newRateStr);
    if (!isNaN(val)) {
      setOverrides(prev => ({ ...prev, [productId]: Math.round(val * 100) }));
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    const payload = {
      customerId: customer.id,
      items: cartItems.map(i => ({
        productId: i.product.id,
        crates: i.crates,
        actualRate: i.actualRate
      })),
      paymentAmount: paymentAmountPaise > 0 ? paymentAmountPaise : undefined,
      paymentMethod: paymentAmountPaise > 0 ? paymentMethod : undefined,
    };

    try {
      await createSale(payload);
      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/salesman/customers/${customer.id}`);
        router.refresh();
      }, 1500);
    } catch (err) {
      alert('Failed to save sale');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 animate-fade-in-up">
        <div className="w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="h-12 w-12 text-alvoun-green" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Sale Recorded!</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Total: <span className="text-alvoun-blue font-bold">{formatMoney(totalAmount)}</span></p>
        <p className="text-sm text-slate-400 mt-8">Redirecting...</p>
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="space-y-6 pb-24 animate-fade-in-up">
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20">
          <button onClick={() => setShowConfirm(false)} className="p-2.5 bg-white dark:bg-slate-950 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 active:bg-slate-50 dark:bg-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">Review Sale</h1>
        </div>
        
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-1">{customer.customerName}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Prev Outstanding: <span className={originalOutstanding > 0 ? 'text-alvoun-red' : ''}>{formatMoney(Math.abs(originalOutstanding))} {originalOutstanding > 0 ? 'Dr' : ''}</span></p>
          </div>

          <div className="space-y-4">
            {cartItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">{item.product.name}</span>
                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{item.crates} crates × {formatMoney(item.actualRate)}</div>
                </div>
                <div className="font-black text-slate-900 dark:text-slate-100 text-lg">{formatMoney(item.amount)}</div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <span className="font-bold text-slate-500 dark:text-slate-400">Total Sale</span>
            <span className="text-2xl font-black text-alvoun-blue">{formatMoney(totalAmount)}</span>
          </div>

          {paymentAmountPaise > 0 && (
            <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 border border-green-100 p-4 rounded-xl">
              <span className="font-bold text-green-700">Payment ({paymentMethod})</span>
              <span className="text-xl font-black text-alvoun-green">-{formatMoney(paymentAmountPaise)}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-900 p-4 rounded-xl text-white">
            <span className="font-bold text-slate-300">New Outstanding</span>
            <span className={`text-2xl font-black ${newOutstanding > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {formatMoney(Math.abs(newOutstanding))} {newOutstanding > 0 ? 'Dr' : ''}
            </span>
          </div>
        </div>

        <div className="fixed bottom-[72px] sm:bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] z-40">
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 bg-alvoun-green text-white rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform flex justify-center items-center gap-2 text-lg shadow-sm"
          >
            {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
            CONFIRM SALE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-40 animate-fade-in-up">
      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20">
        <Link href={`/dashboard/salesman/customers/${customer.id}`} className="p-2.5 bg-white dark:bg-slate-950 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 active:bg-slate-50 dark:bg-slate-900 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate mb-0.5">{customer.customerName}</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Outstanding: <span className={originalOutstanding > 0 ? 'text-alvoun-red' : ''}>{formatMoney(Math.abs(originalOutstanding))}</span></p>
        </div>
      </div>

      <div className="space-y-4">
        {products.map(product => {
          const crates = quantities[product.id] || 0;
          const applicableRate = product.rates.find((r: any) => crates >= r.minQuantity) || product.rates[product.rates.length - 1];
          const standardRate = applicableRate ? applicableRate.rate : 0;
          const actualRate = overrides[product.id] !== undefined ? overrides[product.id] : standardRate;
          const isActive = crates > 0;

          return (
            <div key={product.id} className={`p-5 rounded-2xl shadow-sm border transition-colors ${isActive ? 'bg-white dark:bg-slate-950 border-alvoun-blue/30 ring-1 ring-alvoun-blue/10' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">{product.name}</h3>
                <div className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{product.bottlesPerCrate} btls/crate</div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-xl p-1.5 border border-slate-200 dark:border-slate-800 shadow-inner">
                  <button 
                    onClick={() => handleCrateChange(product.id, -1)}
                    className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-950 rounded-lg shadow-sm text-slate-600 dark:text-slate-400 active:scale-95 transition-transform"
                  >
                    <Minus className="h-6 w-6" />
                  </button>
                  <span className="w-8 text-center font-black text-2xl text-slate-900 dark:text-slate-100">{crates}</span>
                  <button 
                    onClick={() => handleCrateChange(product.id, 1)}
                    className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-950 rounded-lg shadow-sm text-alvoun-blue active:scale-95 transition-transform"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{formatMoney(crates * actualRate)}</div>
                  <div className="text-xs font-bold text-alvoun-blue mt-1">{crates * product.bottlesPerCrate} bottles</div>
                </div>
              </div>

              {isActive && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 animate-fade-in-up">
                  <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    Rate / Crate
                  </div>
                  <div className="flex items-center relative max-w-[140px]">
                    <IndianRupee className="absolute left-3 h-4 w-4 text-slate-400" />
                    <input 
                      type="number" 
                      value={overrides[product.id] !== undefined ? overrides[product.id] / 100 : standardRate / 100}
                      onChange={(e) => handleRateOverride(product.id, e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-alvoun-blue focus:bg-white dark:bg-slate-950 transition-all text-right shadow-inner"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-alvoun-green" />
            Payment Collection
          </h3>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <IndianRupee className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input 
                type="number" 
                placeholder="0.00"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-alvoun-green focus:bg-white dark:bg-slate-950 transition-all shadow-inner"
              />
            </div>
            <select 
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-1/3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-alvoun-green focus:bg-white dark:bg-slate-950"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank">Bank</option>
            </select>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[72px] sm:bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] z-40">
        <div className="flex justify-between items-center mb-3 px-2">
          <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-sm">Cart Total</span>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{formatMoney(totalAmount)}</span>
        </div>
        <button 
          onClick={() => setShowConfirm(true)}
          disabled={totalAmount === 0}
          className="w-full py-4 bg-alvoun-blue text-white rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-lg shadow-sm"
        >
          <ShoppingCart className="h-6 w-6" />
          REVIEW SALE
        </button>
      </div>
    </div>
  );
}

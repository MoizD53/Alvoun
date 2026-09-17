'use client';

import { useState, useMemo } from 'react';
import { createSale } from '@/lib/actions/salesman/sale';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';

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
      paymentAmount: paymentAmountPaise,
      paymentMethod: paymentAmountPaise > 0 ? paymentMethod : undefined
    };

    const res = await createSale(payload);
    
    if (res.error) {
      alert(res.error);
      setSubmitting(false);
      setShowConfirm(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-6 mt-10">
        <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-2">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Sale Saved</h2>
        
        <div className="w-full bg-slate-50 p-4 rounded-xl text-left space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-500">Sale Amount</span>
            <span className="font-bold">₹{(totalAmount / 100).toFixed(2)}</span>
          </div>
          {paymentAmountPaise > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Payment Received ({paymentMethod})</span>
              <span className="font-bold">-₹{(paymentAmountPaise / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="pt-3 border-t border-slate-200 flex justify-between">
            <span className="font-bold text-slate-900">New Outstanding</span>
            <span className={`font-bold ${newOutstanding > 0 ? 'text-red-500' : 'text-green-500'}`}>
              ₹{(Math.abs(newOutstanding) / 100).toFixed(2)} {newOutstanding > 0 ? 'Dr' : ''}
            </span>
          </div>
        </div>

        <button 
          onClick={() => router.push(`/dashboard/salesman/customers/${customer.id}`)}
          className="w-full py-4 bg-alvoun-blue text-white rounded-xl font-bold active:scale-95 transition-transform"
        >
          Return to Customer
        </button>
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowConfirm(false)} className="p-2 bg-white rounded-full shadow-sm border border-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Confirm Sale</h1>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <div>
            <h2 className="font-bold text-slate-900">{customer.customerName}</h2>
            <p className="text-sm text-slate-500">Current Outstanding: ₹{(Math.abs(originalOutstanding)/100).toFixed(2)}</p>
          </div>

          <div className="space-y-3">
            {cartItems.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <div>
                  <span className="font-bold text-slate-700">{item.product.name}</span>
                  <div className="text-slate-500">{item.crates} crates × ₹{(item.actualRate/100).toFixed(2)}</div>
                </div>
                <div className="font-bold text-slate-900">₹{(item.amount/100).toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between text-lg">
            <span className="font-bold text-slate-900">Total Sale</span>
            <span className="font-bold text-alvoun-blue">₹{(totalAmount/100).toFixed(2)}</span>
          </div>

          {paymentAmountPaise > 0 && (
            <div className="flex justify-between text-green-600 bg-green-50 p-3 rounded-lg">
              <span className="font-medium">Payment ({paymentMethod})</span>
              <span className="font-bold">-₹{(paymentAmountPaise/100).toFixed(2)}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-between text-lg bg-slate-50 p-4 rounded-xl">
            <span className="font-bold text-slate-900">New Outstanding</span>
            <span className={`font-bold ${newOutstanding > 0 ? 'text-red-500' : 'text-green-500'}`}>
              ₹{(Math.abs(newOutstanding)/100).toFixed(2)}
            </span>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 bg-alvoun-blue text-white rounded-xl font-bold disabled:opacity-50 active:scale-95 transition-transform"
          >
            {submitting ? 'Saving...' : 'CONFIRM SALE'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/salesman/customers/${customer.id}`} className="p-2 bg-white rounded-full shadow-sm border border-slate-100 text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="truncate">
          <h1 className="text-xl font-bold text-slate-900 truncate">{customer.customerName}</h1>
          <p className="text-xs font-medium text-slate-500">Outstanding: ₹{(Math.abs(originalOutstanding)/100).toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-4 pb-32">
        {products.map(product => {
          const crates = quantities[product.id] || 0;
          const applicableRate = product.rates.find((r: any) => crates >= r.minQuantity) || product.rates[product.rates.length - 1];
          const standardRate = applicableRate ? applicableRate.rate : 0;
          const actualRate = overrides[product.id] !== undefined ? overrides[product.id] : standardRate;

          return (
            <div key={product.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 text-lg">{product.name}</h3>
                <div className="text-sm text-slate-500">{product.bottlesPerCrate} btls/crate</div>
              </div>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-1 border border-slate-200">
                  <button 
                    onClick={() => handleCrateChange(product.id, -1)}
                    className="w-12 h-12 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-2xl text-slate-600 active:bg-slate-100"
                  >-</button>
                  <span className="w-8 text-center font-bold text-xl">{crates}</span>
                  <button 
                    onClick={() => handleCrateChange(product.id, 1)}
                    className="w-12 h-12 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-2xl text-alvoun-blue active:bg-slate-100"
                  >+</button>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">₹{((crates * actualRate)/100).toFixed(2)}</div>
                  <div className="text-xs font-medium text-slate-400">{crates * product.bottlesPerCrate} bottles</div>
                </div>
              </div>

              {crates > 0 && (
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-4">
                  <div className="text-xs font-medium text-slate-500">
                    Rate/Crate
                  </div>
                  <div className="flex items-center relative max-w-[120px]">
                    <span className="absolute left-3 text-slate-400 font-medium">₹</span>
                    <input 
                      type="number" 
                      value={overrides[product.id] !== undefined ? overrides[product.id] / 100 : standardRate / 100}
                      onChange={(e) => handleRateOverride(product.id, e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-alvoun-blue focus:bg-white transition-all text-right"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Payment Received (Optional)</h3>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-lg">₹</span>
              <input 
                type="number" 
                placeholder="0.00"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-alvoun-blue focus:bg-white"
              />
            </div>
            <select 
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-1/3 bg-slate-50 border border-slate-200 rounded-xl px-3 font-medium text-slate-700"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank">Bank</option>
            </select>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[72px] sm:bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] z-40 max-w-md mx-auto sm:max-w-none">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-slate-500">Total Amount</span>
          <span className="text-2xl font-bold text-slate-900">₹{(totalAmount/100).toFixed(2)}</span>
        </div>
        <button 
          onClick={() => setShowConfirm(true)}
          disabled={totalAmount === 0}
          className="w-full py-4 bg-alvoun-blue text-white rounded-xl font-bold disabled:opacity-50 active:scale-95 transition-transform"
        >
          REVIEW SALE
        </button>
      </div>
    </div>
  );
}

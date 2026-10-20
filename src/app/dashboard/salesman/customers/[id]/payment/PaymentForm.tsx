'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, IndianRupee, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import { createStandalonePayment } from '@/lib/actions/salesman/payment';

export default function PaymentForm({ customer }: { customer: any }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    const val = Math.round(parseFloat(amount) * 100);
    if (!val || val <= 0) return alert('Enter a valid amount');
    
    setSubmitting(true);
    try {
      await createStandalonePayment({
        customerId: customer.id,
        amount: val,
        method
      });
      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/salesman/customers/${customer.id}`);
        router.refresh();
      }, 1500);
    } catch (err) {
      alert('Failed to process payment');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 animate-fade-in-up">
        <div className="w-24 h-24 bg-emerald-500/15 border-2 border-emerald-500/30 rounded-3xl flex items-center justify-center mb-6 shadow-raised">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-black text-text-primary mb-2">Payment Collected!</h1>
        <p className="text-text-secondary font-medium text-lg">
          Amount: <span className="text-emerald-600 dark:text-emerald-400 font-black">{formatMoney(Math.round(parseFloat(amount) * 100))}</span>
        </p>
        <p className="text-xs text-text-muted mt-8 font-semibold tracking-wide uppercase">Redirecting to customer details...</p>
      </div>
    );
  }

  const originalOutstanding = customer.outstanding;
  const currentAmount = Math.round(parseFloat(amount || '0') * 100);
  const newOutstanding = originalOutstanding - currentAmount;

  return (
    <div className="space-y-6 pb-36 animate-fade-in-up">
      {/* Top Nav */}
      <div className="flex items-center gap-3 bg-surface/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20 border-b border-border-subtle/40">
        <Link 
          href={`/dashboard/salesman/customers/${customer.id}`} 
          className="w-10 h-10 flex items-center justify-center bg-surface-raised rounded-2xl shadow-raised-sm border border-border-subtle text-text-primary active:shadow-inset active:scale-95 transition-all"
          aria-label="Back to customer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-black text-text-primary truncate tracking-tight">Collect Payment</h1>
      </div>

      {/* Customer Header */}
      <div className="bg-surface-raised p-6 rounded-3xl shadow-raised border border-border-subtle">
        <h2 className="font-black text-text-primary text-xl mb-1">{customer.customerName}</h2>
        <p className="text-sm text-text-muted font-medium">
          Previous Outstanding:{' '}
          <span className={originalOutstanding > 0 ? 'text-accent-terracotta font-black' : 'text-text-primary font-bold'}>
            {formatMoney(Math.abs(originalOutstanding))} {originalOutstanding > 0 ? 'Dr' : ''}
          </span>
        </p>
      </div>

      {/* Collection Form Card */}
      <div className="bg-surface-raised p-6 rounded-3xl shadow-raised border border-border-subtle space-y-6">
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
            Collection Amount
          </label>
          <div className="relative">
            <IndianRupee className="absolute left-4 top-4 h-6 w-6 text-brand-teal" />
            <input 
              type="number" 
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-surface-sunken shadow-inset border border-border-subtle rounded-2xl text-2xl font-black text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-all"
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
            Payment Method
          </label>
          <select 
            value={method}
            onChange={e => setMethod(e.target.value)}
            className="w-full bg-surface-sunken shadow-inset border border-border-subtle rounded-2xl p-4 font-bold text-text-primary text-base focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
          >
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>

        <div className="pt-4 border-t border-border-subtle flex justify-between items-center bg-surface-sunken shadow-inset p-4 rounded-2xl">
          <div>
            <span className="font-bold text-text-primary text-sm uppercase tracking-wider block">New Outstanding</span>
            <span className="text-[10px] text-text-muted font-medium">(Auto calculated)</span>
          </div>
          <span className={`text-2xl font-black ${newOutstanding > 0 ? 'text-accent-terracotta' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatMoney(Math.abs(newOutstanding))} {newOutstanding > 0 ? 'Dr' : ''}
          </span>
        </div>
      </div>

      {/* Fixed Confirm Button (Safe area above bottom nav on mobile) */}
      <div className="fixed bottom-[74px] sm:bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-md border-t border-border-subtle p-4 shadow-raised-lg z-40">
        <div className="max-w-md mx-auto">
          <button 
            onClick={handleSubmit}
            disabled={submitting || currentAmount <= 0}
            className="w-full min-h-[52px] py-3.5 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-black text-base disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-raised tracking-wide"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <IndianRupee className="h-5 w-5" />}
            CONFIRM PAYMENT
          </button>
        </div>
      </div>
    </div>
  );
}

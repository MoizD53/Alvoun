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
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="h-12 w-12 text-alvoun-green" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Collected!</h1>
        <p className="text-slate-500 font-medium text-lg">Amount: <span className="text-alvoun-green font-bold">{formatMoney(Math.round(parseFloat(amount) * 100))}</span></p>
        <p className="text-sm text-slate-400 mt-8">Redirecting...</p>
      </div>
    );
  }

  const originalOutstanding = customer.outstanding;
  const currentAmount = Math.round(parseFloat(amount || '0') * 100);
  const newOutstanding = originalOutstanding - currentAmount;

  return (
    <div className="space-y-6 pb-24 animate-fade-in-up">
      <div className="flex items-center gap-4 bg-slate-50 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20">
        <Link href={`/dashboard/salesman/customers/${customer.id}`} className="p-2.5 bg-white rounded-full shadow-sm border border-slate-200 text-slate-700 active:bg-slate-50 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900 truncate">Collect Payment</h1>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="font-bold text-slate-900 text-lg mb-1">{customer.customerName}</h2>
        <p className="text-sm text-slate-500 font-medium">Prev Outstanding: <span className={originalOutstanding > 0 ? 'text-alvoun-red' : ''}>{formatMoney(Math.abs(originalOutstanding))} {originalOutstanding > 0 ? 'Dr' : ''}</span></p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Collection Amount</label>
          <div className="relative">
            <IndianRupee className="absolute left-4 top-4 h-6 w-6 text-slate-400" />
            <input 
              type="number" 
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-black focus:outline-none focus:ring-2 focus:ring-alvoun-green focus:bg-white transition-all shadow-inner"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Payment Method</label>
          <select 
            value={method}
            onChange={e => setMethod(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-700 text-lg focus:outline-none focus:ring-2 focus:ring-alvoun-green focus:bg-white"
          >
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-between items-center bg-slate-50 p-4 rounded-xl">
          <span className="font-bold text-slate-900">New Outstanding</span>
          <span className={`text-2xl font-black ${newOutstanding > 0 ? 'text-alvoun-red' : 'text-alvoun-green'}`}>
            {formatMoney(Math.abs(newOutstanding))} {newOutstanding > 0 ? 'Dr' : ''}
          </span>
        </div>
      </div>

      <div className="fixed bottom-[72px] sm:bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] z-40">
        <button 
          onClick={handleSubmit}
          disabled={submitting || currentAmount <= 0}
          className="w-full py-4 bg-alvoun-green text-white rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-lg shadow-sm"
        >
          {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <IndianRupee className="h-6 w-6" />}
          CONFIRM PAYMENT
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { startVisit, completeVisit } from '@/lib/actions/salesman/visit';
import { useRouter } from 'next/navigation';
import { Navigation, FileX, ShoppingCart, Loader2, CheckCircle2 } from 'lucide-react';

export default function VisitWorkflow({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [visitId, setVisitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [noSaleReason, setNoSaleReason] = useState('');

  const handleStart = async () => {
    setLoading(true);
    try {
      const id = await startVisit(customerId);
      setVisitId(id);
    } catch (err) {
      alert('Failed to start visit');
    }
    setLoading(false);
  };

  const handleComplete = async () => {
    if (!visitId) return;
    setLoading(true);
    try {
      await completeVisit(visitId, noSaleReason);
      setVisitId(null);
      setShowComplete(false);
      setNoSaleReason('');
      alert('Visit completed');
    } catch (err) {
      alert('Failed to complete visit');
    }
    setLoading(false);
  };

  if (visitId) {
    if (showComplete) {
      return (
        <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 mt-6 animate-fade-in-up">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <FileX className="h-5 w-5 text-slate-400" />
            Complete Without Sale
          </h3>
          <select 
            className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 text-slate-700 dark:text-slate-300 font-medium"
            value={noSaleReason}
            onChange={e => setNoSaleReason(e.target.value)}
          >
            <option value="">Select Reason...</option>
            <option value="Customer closed">Customer closed</option>
            <option value="No requirement">No requirement</option>
            <option value="Payment collection only">Payment collection only</option>
            <option value="Owner unavailable">Owner unavailable</option>
            <option value="Other">Other</option>
          </select>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowComplete(false)} 
              className="flex-1 py-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-600 dark:text-slate-400 active:bg-slate-50 dark:active:bg-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleComplete} 
              disabled={loading || !noSaleReason}
              className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50 flex justify-center items-center gap-2 active:bg-slate-800 transition-colors"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              Submit
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 w-full animate-fade-in-up">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl p-3 flex items-center gap-2 mb-2">
           <span className="relative flex h-2.5 w-2.5 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
           <span className="font-bold text-green-800 dark:text-green-400 text-xs uppercase tracking-wider">Visit Active</span>
        </div>

        <button 
          onClick={() => router.push(`/dashboard/salesman/customers/${customerId}/sale`)}
          className="w-full py-3 bg-alvoun-blue text-white rounded-lg font-bold active:bg-alvoun-dark transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
        >
          <ShoppingCart className="h-4 w-4" />
          TAKE ORDER
        </button>
        <button 
          onClick={() => setShowComplete(true)}
          className="w-full py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold active:bg-slate-50 dark:active:bg-slate-900 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
        >
          <CheckCircle2 className="h-4 w-4 text-slate-400" />
          END VISIT
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button 
        onClick={handleStart}
        disabled={loading}
        className="w-full py-3 bg-alvoun-blue text-white rounded-lg font-bold active:bg-alvoun-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
        START VISIT
      </button>
    </div>
  );
}

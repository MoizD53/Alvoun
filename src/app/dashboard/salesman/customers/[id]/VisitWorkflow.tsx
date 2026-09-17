'use client';

import { useState } from 'react';
import { startVisit, completeVisit } from '@/lib/actions/salesman/visit';
import { useRouter } from 'next/navigation';

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
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
          <h3 className="font-bold mb-2">Complete Visit Without Sale</h3>
          <select 
            className="w-full p-3 rounded-lg border border-slate-300 mb-3 bg-white"
            value={noSaleReason}
            onChange={e => setNoSaleReason(e.target.value)}
          >
            <option value="">Select Reason...</option>
            <option value="Customer closed">Customer closed</option>
            <option value="No requirement">No requirement</option>
            <option value="Payment collection only">Payment collection only</option>
            <option value="Other">Other</option>
          </select>
          <div className="flex gap-2">
            <button onClick={() => setShowComplete(false)} className="flex-1 py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-700">Cancel</button>
            <button 
              onClick={handleComplete} 
              disabled={loading || !noSaleReason}
              className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50"
            >
              Complete
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button 
          onClick={() => setShowComplete(true)}
          className="col-span-2 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
        >
          COMPLETE VISIT
        </button>
        <button 
          onClick={() => router.push(`/dashboard/salesman/customers/${customerId}/sale`)}
          className="col-span-2 py-4 bg-alvoun-blue text-white rounded-xl font-bold hover:bg-alvoun-dark transition-colors"
        >
          NEW SALE
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      <button 
        onClick={handleStart}
        disabled={loading}
        className="col-span-2 py-4 bg-alvoun-blue text-white rounded-xl font-bold hover:bg-alvoun-dark transition-colors disabled:opacity-50"
      >
        {loading ? 'Starting...' : 'START VISIT'}
      </button>
    </div>
  );
}

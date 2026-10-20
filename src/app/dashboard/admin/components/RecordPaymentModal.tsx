'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Wallet, 
  IndianRupee, 
  Search, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Calendar,
  Building2
} from 'lucide-react';
import { recordAdminPayment, getCustomersForPayment } from '../actions/payment';
import { formatMoney } from '@/lib/format';
import { getKolkataDateString, getCurrentKolkataTime } from '@/lib/time';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  defaultDate,
}: RecordPaymentModalProps) {
  const router = useRouter();
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState<{ id: string; name: string; contact: string; areaName: string }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(defaultDate || getKolkataDateString(getCurrentKolkataTime()));
  const [notes, setNotes] = useState('');
  
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ customerName: string; amountPaise: number } | null>(null);

  // Load customer suggestions
  useEffect(() => {
    if (!isOpen) {
      setSuccessInfo(null);
      setErrorMessage('');
      setAmountRupees('');
      setNotes('');
      return;
    }

    let isMounted = true;
    const fetchCustomers = async () => {
      setIsSearching(true);
      try {
        const results = await getCustomersForPayment(customerSearch);
        if (isMounted) setCustomerList(results);
      } catch (err) {
        console.error('Failed to load customers:', err);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchCustomers, customerSearch ? 250 : 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [customerSearch, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedCustomerId) {
      setErrorMessage('Please select a customer.');
      return;
    }

    const rupees = parseFloat(amountRupees);
    if (isNaN(rupees) || rupees <= 0) {
      setErrorMessage('Please enter a valid positive payment amount.');
      return;
    }

    const amountPaise = Math.round(rupees * 100);

    setIsSubmitting(true);
    try {
      const res = await recordAdminPayment({
        customerId: selectedCustomerId,
        amountPaise,
        paymentMethod,
        paymentDateStr: paymentDate,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        setSuccessInfo({
          customerName: res.customerName,
          amountPaise: res.amountPaise,
        });
        router.refresh();
      }
    } catch (err: any) {
      console.error('Record payment error:', err);
      setErrorMessage(err.message || 'Failed to record payment. Please verify inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2015]/50 dark:bg-black/70 backdrop-blur-xs animate-fade-in-up">
      <div 
        className="w-full max-w-lg bg-surface-raised border border-border-default shadow-raised rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border-default flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 id="payment-modal-title" className="text-base font-bold text-primary tracking-tight">
                Record Payment Collection
              </h2>
              <p className="text-[11px] text-secondary">
                Credit payment ledger directly to retail customer
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface-inset transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {successInfo ? (
            <div className="py-8 text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-raised">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-black text-primary">Payment Recorded Successfully</h3>
              <p className="text-xs text-secondary max-w-xs mx-auto">
                <span className="font-bold text-primary">{formatMoney(successInfo.amountPaise)}</span> collected from{' '}
                <span className="font-bold text-primary">{successInfo.customerName}</span> via{' '}
                <span className="font-semibold text-teal-800 dark:text-teal-300">{paymentMethod}</span>.
              </p>
              <div className="pt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessInfo(null);
                    setAmountRupees('');
                    setSelectedCustomerId('');
                    setSelectedCustomerName('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-surface-raised border border-border-default shadow-raised text-xs font-bold text-primary hover:bg-surface-inset cursor-pointer transition-all"
                >
                  Record Another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#1A5F63] text-white shadow-raised text-xs font-bold hover:bg-[#144C4F] cursor-pointer transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. Customer Selection */}
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1.5">
                  1. Select Customer *
                </label>
                {selectedCustomerId ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-inset border border-teal-500/40 shadow-inset">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-primary truncate leading-tight">
                        {selectedCustomerName}
                      </p>
                      <p className="text-[10px] text-teal-800 dark:text-teal-300 font-semibold mt-0.5">
                        Selected retail partner
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId('');
                        setSelectedCustomerName('');
                      }}
                      className="text-[10px] font-bold text-secondary hover:text-danger px-2 py-1 rounded bg-surface-raised border border-border-default cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative flex items-center">
                      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search customer by name or phone..."
                        className="w-full h-10 pl-9 pr-8 text-xs font-semibold rounded-xl bg-surface-inset border border-border-default shadow-inset text-primary placeholder:text-muted focus:outline-none focus:border-teal-500 transition-all"
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-teal-600" />
                      )}
                    </div>

                    <div className="max-h-36 overflow-y-auto rounded-xl border border-border-default bg-surface-inset/60 divide-y divide-border-subtle">
                      {customerList.length === 0 ? (
                        <div className="p-3 text-center text-[11px] text-muted">
                          {isSearching ? 'Loading customers...' : 'No customers found.'}
                        </div>
                      ) : (
                        customerList.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setSelectedCustomerName(c.name);
                              setErrorMessage('');
                            }}
                            className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-raised cursor-pointer transition-colors"
                          >
                            <span className="font-bold text-primary truncate">{c.name}</span>
                            <span className="text-[10px] text-secondary font-mono shrink-0 ml-2">
                              {c.areaName}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Amount & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1.5">
                    2. Amount (₹) *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-sm font-bold text-muted">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={amountRupees}
                      onChange={(e) => setAmountRupees(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full h-10 pl-8 pr-3 text-xs font-mono font-bold rounded-xl bg-surface-inset border border-border-default shadow-inset text-primary focus:outline-none focus:border-teal-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1.5">
                    3. Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl bg-surface-inset border border-border-default shadow-inset text-primary focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              {/* 3. Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1.5">
                    4. Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl bg-surface-inset border border-border-default shadow-inset text-primary focus:outline-none focus:border-teal-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1.5">
                    5. Reference / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Voucher or bank ref..."
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl bg-surface-inset border border-border-default shadow-inset text-primary placeholder:text-muted focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-surface-raised border border-border-default shadow-raised text-xs font-bold text-secondary hover:text-primary transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCustomerId || !amountRupees}
                  className="px-5 py-2.5 rounded-xl bg-[#1A5F63] hover:bg-[#144C4F] text-white shadow-raised text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Record Payment Voucher</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

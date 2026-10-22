'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle2, 
  IndianRupee, 
  Loader2, 
  Banknote, 
  QrCode, 
  Calendar, 
  FileText, 
  Printer, 
  Share2, 
  ShieldCheck,
  Building2,
  Receipt
} from 'lucide-react';
import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import { createStandalonePayment } from '@/lib/actions/salesman/payment';

interface ReceiptData {
  receiptNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  customerPhone: string;
  salesmanName: string;
  salesmanCode: string;
  previousOutstanding: number;
  totalCollected: number;
  remainingOutstanding: number;
  cashAmount: number;
  upiAmount: number;
  otherAmount: number;
  paymentMethod: string;
  referenceNumber: string;
  remarks: string;
}

export default function PaymentForm({ customer }: { customer: any }) {
  const router = useRouter();

  const originalOutstanding = customer.outstanding || 0;
  const customerCode = `CUST-${customer.id.slice(-4).toUpperCase()}`;

  // Form State
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'SPLIT' | 'BANK'>('CASH');
  const [singleAmountStr, setSingleAmountStr] = useState('');
  const [cashAmountStr, setCashAmountStr] = useState('');
  const [upiAmountStr, setUpiAmountStr] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // Computations
  let totalReceivedCents = 0;
  if (paymentMode === 'SPLIT') {
    const c = cashAmountStr ? Math.round(parseFloat(cashAmountStr) * 100) : 0;
    const u = upiAmountStr ? Math.round(parseFloat(upiAmountStr) * 100) : 0;
    totalReceivedCents = (isNaN(c) ? 0 : c) + (isNaN(u) ? 0 : u);
  } else {
    const s = singleAmountStr ? Math.round(parseFloat(singleAmountStr) * 100) : 0;
    totalReceivedCents = isNaN(s) ? 0 : s;
  }

  const remainingOutstanding = originalOutstanding - totalReceivedCents;

  // Preset pill click handler
  const handlePresetClick = (amountCents: number) => {
    const rupees = (amountCents / 100).toString();
    if (paymentMode === 'SPLIT') {
      setCashAmountStr(rupees);
      setUpiAmountStr('');
    } else {
      setSingleAmountStr(rupees);
    }
  };

  const handleSubmit = async () => {
    if (originalOutstanding <= 0) {
      setError('Customer does not have an outstanding debit balance.');
      return;
    }

    if (totalReceivedCents <= 0) {
      setError('Please enter a collection amount greater than ₹0.');
      return;
    }

    if (totalReceivedCents > originalOutstanding) {
      if (!confirm(`The amount entered (₹${(totalReceivedCents / 100).toFixed(2)}) is greater than the outstanding balance (₹${(originalOutstanding / 100).toFixed(2)}). Do you wish to continue and record advance credit?`)) {
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      let payload: any = {
        customerId: customer.id,
        paymentDateStr: paymentDate,
        referenceNumber: referenceNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
      };

      if (paymentMode === 'SPLIT') {
        const c = cashAmountStr ? Math.round(parseFloat(cashAmountStr) * 100) : 0;
        const u = upiAmountStr ? Math.round(parseFloat(upiAmountStr) * 100) : 0;
        payload.cashAmount = c;
        payload.upiAmount = u;
        payload.method = 'Split';
      } else if (paymentMode === 'CASH') {
        payload.amount = totalReceivedCents;
        payload.method = 'Cash';
      } else if (paymentMode === 'UPI') {
        payload.amount = totalReceivedCents;
        payload.method = 'UPI';
      } else {
        payload.amount = totalReceivedCents;
        payload.method = 'Bank Transfer';
      }

      const res = await createStandalonePayment(payload);
      if (res.receipt) {
        setReceipt(res.receipt);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
      setSubmitting(false);
    }
  };

  // WhatsApp Share handler
  const handleWhatsAppShare = () => {
    if (!receipt) return;
    const msg = `*ALVOUN PAYMENT RECEIPT*\n` +
      `Receipt No: ${receipt.receiptNumber}\n` +
      `Date: ${receipt.date}\n` +
      `Customer: ${receipt.customerName} (${receipt.customerCode})\n` +
      `Previous Due: ₹${(receipt.previousOutstanding / 100).toFixed(2)}\n` +
      `*Amount Collected: ₹${(receipt.totalCollected / 100).toFixed(2)}*\n` +
      `Payment Mode: ${receipt.paymentMethod}\n` +
      `Remaining Due: ₹${(receipt.remainingOutstanding / 100).toFixed(2)}\n` +
      `Collected By: ${receipt.salesmanName} (${receipt.salesmanCode})\n` +
      `Status: VERIFIED & RECORDED\n\n` +
      `Thank you for your business! - Alvoun Beverages`;

    const cleanPhone = (receipt.customerPhone || '').replace(/[^0-9]/g, '');
    const phoneParam = cleanPhone.length >= 10 ? `&phone=91${cleanPhone.slice(-10)}` : '';
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}${phoneParam}`, '_blank');
  };

  // PRINTABLE VERIFIED RECEIPT VIEW
  if (receipt) {
    return (
      <div className="space-y-6 pb-24 animate-fade-in max-w-xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href={`/dashboard/salesman/customers/${customer.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-primary p-2 rounded-xl bg-surface-raised shadow-raised-sm border border-border-subtle"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customer
          </Link>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> PAYMENT CONFIRMED
          </span>
        </div>

        {/* The Receipt Document Card */}
        <div id="printable-receipt" className="bg-surface-raised rounded-3xl shadow-raised-lg border-2 border-emerald-500/30 p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="border-b border-border-subtle pb-5 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-5 w-5 text-brand-teal" />
                <h1 className="text-xl font-black tracking-tight text-text-primary">ALVOUN BEVERAGES</h1>
              </div>
              <p className="text-xs text-text-muted font-medium">Official Payment Receipt & Due Acknowledgment</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="h-3.5 w-3.5" /> VERIFIED
              </span>
            </div>
          </div>

          {/* Receipt Meta */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-surface-sunken p-4 rounded-2xl shadow-inset border border-border-subtle">
            <div>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Receipt Number</span>
              <span className="font-mono font-extrabold text-foreground">{receipt.receiptNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Date & Time</span>
              <span className="font-semibold text-foreground">{receipt.date}</span>
            </div>
          </div>

          {/* Customer & Collector Info */}
          <div className="grid grid-cols-2 gap-4 text-xs pt-1">
            <div>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Customer</span>
              <p className="font-black text-text-primary text-sm mt-0.5">{receipt.customerName}</p>
              <p className="text-text-muted font-mono text-[11px]">{receipt.customerCode}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Collected By</span>
              <p className="font-bold text-text-primary text-sm mt-0.5">{receipt.salesmanName}</p>
              <p className="text-text-muted font-mono text-[11px]">{receipt.salesmanCode}</p>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border-t border-b border-border-subtle py-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-text-muted">
              <span>Previous Outstanding Balance:</span>
              <span className="font-mono font-bold text-text-primary">{formatMoney(receipt.previousOutstanding)}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <Receipt className="h-4 w-4" />
                <span>Amount Collected:</span>
              </div>
              <span className="text-lg font-black font-mono">{formatMoney(receipt.totalCollected)}</span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-text-primary uppercase tracking-wider">Remaining Due Balance:</span>
              <span className={`text-base font-black font-mono ${receipt.remainingOutstanding > 0 ? 'text-accent-terracotta' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatMoney(Math.abs(receipt.remainingOutstanding))} {receipt.remainingOutstanding > 0 ? 'Dr' : (receipt.remainingOutstanding < 0 ? 'Cr' : '')}
              </span>
            </div>
          </div>

          {/* Payment Method & Reference details */}
          <div className="text-xs space-y-1.5 bg-surface-sunken p-4 rounded-2xl shadow-inset border border-border-subtle">
            <div className="flex justify-between">
              <span className="text-text-muted">Payment Mode:</span>
              <span className="font-bold text-text-primary">{receipt.paymentMethod}</span>
            </div>
            {receipt.referenceNumber && (
              <div className="flex justify-between">
                <span className="text-text-muted">Transaction / Ref No:</span>
                <span className="font-mono font-semibold text-text-primary">{receipt.referenceNumber}</span>
              </div>
            )}
            {receipt.remarks && (
              <div className="flex justify-between">
                <span className="text-text-muted">Remarks:</span>
                <span className="font-medium text-text-primary">{receipt.remarks}</span>
              </div>
            )}
          </div>

          {/* Actions: WhatsApp & Print */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="min-h-[48px] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-raised active:scale-[0.98] transition-all cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
              WhatsApp Receipt
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[48px] py-3 px-4 bg-surface-raised hover:bg-surface-sunken text-text-primary border border-border-subtle rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-raised active:scale-[0.98] transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print / Save
            </button>
          </div>

          <div className="pt-2 text-center">
            <Link
              href={`/dashboard/salesman/customers/${customer.id}`}
              className="text-xs font-bold text-brand-teal hover:underline inline-flex items-center gap-1"
            >
              Back to Customer Details &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // PAYMENT COLLECTION FORM
  return (
    <div className="space-y-6 pb-36 animate-fade-in-up max-w-xl mx-auto">
      {/* Top Nav */}
      <div className="flex items-center gap-3 bg-surface/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20 border-b border-border-subtle/40">
        <Link 
          href={`/dashboard/salesman/customers/${customer.id}`} 
          className="w-10 h-10 flex items-center justify-center bg-surface-raised rounded-2xl shadow-raised-sm border border-border-subtle text-text-primary active:shadow-inset active:scale-95 transition-all"
          aria-label="Back to customer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-text-primary truncate tracking-tight">Receipt / Collect Due</h1>
          <span className="text-[11px] text-text-muted font-mono">{customerCode}</span>
        </div>
      </div>

      {/* Customer Header & Due Balance */}
      <div className="bg-surface-raised p-6 rounded-3xl shadow-raised border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-text-primary text-xl mb-0.5">{customer.customerName}</h2>
          <p className="text-xs text-text-muted font-medium">{customer.address || customer.city?.name}</p>
        </div>
        <div className="text-left sm:text-right p-3.5 bg-surface-sunken rounded-2xl shadow-inset border border-border-subtle">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Previous Due Balance</div>
          <div className={`text-2xl font-black tracking-tight ${originalOutstanding > 0 ? 'text-accent-terracotta' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatMoney(Math.abs(originalOutstanding))} {originalOutstanding > 0 ? 'Dr' : ''}
          </div>
        </div>
      </div>

      {/* Main Payment Form Card */}
      <div className="bg-surface-raised p-6 rounded-3xl shadow-raised border border-border-subtle space-y-5">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-xl animate-fade-in">
            {error}
          </div>
        )}

        {/* Payment Method Selector Tabs */}
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5">
            Payment Method
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'CASH', label: 'Cash', icon: Banknote },
              { id: 'UPI', label: 'UPI', icon: QrCode },
              { id: 'SPLIT', label: 'Split', icon: Receipt },
              { id: 'BANK', label: 'Bank / Cheque', icon: Building2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = paymentMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPaymentMode(tab.id as any)}
                  className={`min-h-[46px] p-2 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-brand-teal text-white shadow-raised'
                      : 'bg-surface-sunken text-text-secondary border border-border-subtle hover:text-text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[11px]">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Presets */}
        {originalOutstanding > 0 && (
          <div>
            <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Quick Amount Select</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePresetClick(originalOutstanding)}
                className="px-3.5 py-1.5 rounded-xl bg-brand-teal/15 hover:bg-brand-teal/25 text-brand-teal border border-brand-teal/30 text-xs font-extrabold transition-all"
              >
                Full Due ({formatMoney(originalOutstanding)})
              </button>
              {originalOutstanding >= 50000 && (
                <button
                  type="button"
                  onClick={() => handlePresetClick(50000)}
                  className="px-3.5 py-1.5 rounded-xl bg-surface-sunken hover:bg-surface-raised text-text-primary border border-border-subtle text-xs font-bold transition-all"
                >
                  ₹500
                </button>
              )}
              {originalOutstanding >= 100000 && (
                <button
                  type="button"
                  onClick={() => handlePresetClick(100000)}
                  className="px-3.5 py-1.5 rounded-xl bg-surface-sunken hover:bg-surface-raised text-text-primary border border-border-subtle text-xs font-bold transition-all"
                >
                  ₹1,000
                </button>
              )}
              {originalOutstanding >= 200000 && (
                <button
                  type="button"
                  onClick={() => handlePresetClick(200000)}
                  className="px-3.5 py-1.5 rounded-xl bg-surface-sunken hover:bg-surface-raised text-text-primary border border-border-subtle text-xs font-bold transition-all"
                >
                  ₹2,000
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSingleAmountStr('');
                  setCashAmountStr('');
                  setUpiAmountStr('');
                }}
                className="px-3 py-1.5 rounded-xl bg-surface-sunken hover:bg-surface-raised text-text-muted border border-border-subtle text-xs font-bold transition-all"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Amount Input Fields */}
        {paymentMode === 'SPLIT' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Cash Amount (₹)</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-3.5 h-5 w-5 text-text-muted" />
                <input 
                  type="number" 
                  inputMode="decimal"
                  placeholder="0.00"
                  value={cashAmountStr}
                  onChange={e => setCashAmountStr(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-surface-sunken shadow-inset border border-border-subtle rounded-2xl text-lg font-black text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-brand-teal" />
                <span>UPI Amount (₹)</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-3.5 h-5 w-5 text-text-muted" />
                <input 
                  type="number" 
                  inputMode="decimal"
                  placeholder="0.00"
                  value={upiAmountStr}
                  onChange={e => setUpiAmountStr(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-surface-sunken shadow-inset border border-border-subtle rounded-2xl text-lg font-black text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Amount Received (₹)</span>
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-4 top-3.5 h-5 w-5 text-text-muted" />
              <input 
                type="number" 
                inputMode="decimal"
                placeholder="0.00"
                value={singleAmountStr}
                onChange={e => setSingleAmountStr(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-surface-sunken shadow-inset border border-border-subtle rounded-2xl text-2xl font-black text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
              />
            </div>
          </div>
        )}

        {/* Date, Ref, and Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-muted" />
              <span>Payment Date</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-sunken shadow-inset border border-border-subtle rounded-xl text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-text-muted" />
              <span>Ref / Cheque / UTR #</span>
            </label>
            <input
              type="text"
              placeholder="Optional transaction reference"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-sunken shadow-inset border border-border-subtle rounded-xl text-xs font-semibold text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
            Remarks / Collection Note (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Old bill clearance, partial payment"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-surface-sunken shadow-inset border border-border-subtle rounded-xl text-xs font-semibold text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
          />
        </div>

        {/* Live Calculation Summary */}
        <div className="pt-4 border-t border-border-subtle space-y-2.5 bg-surface-sunken shadow-inset p-4 rounded-2xl">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-text-secondary">Previous Outstanding:</span>
            <span className="font-mono font-bold text-text-primary">{formatMoney(originalOutstanding)}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-text-secondary">Total Received Today:</span>
            <span className="font-mono font-extrabold text-base text-emerald-600 dark:text-emerald-400">
              {formatMoney(totalReceivedCents)}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border-subtle/80">
            <div>
              <span className="font-bold text-text-primary text-xs uppercase tracking-wider block">Remaining Due</span>
              <span className="text-[10px] text-text-muted font-medium">(Auto calculated)</span>
            </div>
            <span className={`text-xl font-black font-mono ${remainingOutstanding > 0 ? 'text-accent-terracotta' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatMoney(Math.abs(remainingOutstanding))} {remainingOutstanding > 0 ? 'Dr' : (remainingOutstanding < 0 ? 'Cr' : '')}
            </span>
          </div>
        </div>
      </div>

      {/* Fixed Confirm Button Bar */}
      <div className="fixed bottom-[74px] sm:bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-md border-t border-border-subtle p-4 shadow-raised-lg z-40">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link
            href={`/dashboard/salesman/customers/${customer.id}`}
            className="min-h-[52px] px-5 py-3.5 bg-surface-raised hover:bg-surface-sunken border border-border-subtle rounded-2xl text-xs font-bold text-text-muted flex items-center justify-center active:scale-95 transition-all"
          >
            Cancel
          </Link>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={submitting || totalReceivedCents <= 0}
            className="flex-1 min-h-[52px] py-3.5 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-black text-base disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-raised tracking-wide cursor-pointer"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <IndianRupee className="h-5 w-5" />}
            CONFIRM & ISSUE RECEIPT ({formatMoney(totalReceivedCents)})
          </button>
        </div>
      </div>
    </div>
  );
}

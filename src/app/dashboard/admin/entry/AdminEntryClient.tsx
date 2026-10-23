'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Store, 
  Plus, 
  ReceiptText, 
  IndianRupee, 
  Box, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Phone,
  CreditCard,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatMoney, formatNumber } from '@/lib/format';
import { 
  saveAdminEntryTransaction, 
  reverseAdminEntryTransaction 
} from '@/lib/actions/admin/admin-entry';

interface ProductItem {
  id: string;
  name: string;
  bottlesPerCrate: number;
  rates: { minQuantity: number; rate: number }[];
}

interface CustomerItem {
  id: string;
  customerName: string;
  firmName?: string | null;
  code?: string | null;
  contact: string;
  address: string;
  routeName: string;
  areaName: string;
  currentOutstandingPaise: number;
  rates: Record<string, number>;
}

interface SavedEntryItem {
  customerId: string;
  customerName: string;
  firmName?: string | null;
  customerCode?: string | null;
  routeName: string;
  areaName: string;
  totalBillPaise: number;
  totalReceivedPaise: number;
  netDuePaise: number;
  productQuantities: Record<string, number>;
  totalPKGs: number;
  paymentMethods: string[];
  remarks: string;
  sales: { id: string }[];
  payments: { id: string }[];
}

interface AdminEntryClientProps {
  initialData: {
    targetDate: string;
    products: ProductItem[];
    customers: CustomerItem[];
    savedEntries: SavedEntryItem[];
    daySummary: {
      totalSalesPaise: number;
      totalReceivedPaise: number;
      netDuePaise: number;
      totalPKGs: number;
      accountsCount: number;
    };
  };
  selectedDate: string;
}

export default function AdminEntryClient({ initialData, selectedDate }: AdminEntryClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search and Customer Selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Form State
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [remarks, setRemarks] = useState<string>('');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return initialData.customers.slice(0, 20);
    const q = customerSearch.toLowerCase().trim();
    return initialData.customers
      .filter((c) => 
        c.customerName.toLowerCase().includes(q) ||
        (c.firmName && c.firmName.toLowerCase().includes(q)) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        c.contact.includes(q) ||
        c.areaName.toLowerCase().includes(q) ||
        c.routeName.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [customerSearch, initialData.customers]);

  const selectedCustomer = useMemo(() => {
    return initialData.customers.find((c) => c.id === selectedCustomerId);
  }, [selectedCustomerId, initialData.customers]);

  // Today in Asia/Kolkata timezone (Strict: no future dates allowed)
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  }, []);

  // Handle Date Navigation with strict future-date block
  const handleDateChange = (newDate: string) => {
    if (newDate > todayStr) {
      setErrorMessage('Future dates are not permitted. Please select today or a past date.');
      newDate = todayStr;
    }
    startTransition(() => {
      router.push(`/dashboard/admin/entry?date=${newDate}`);
    });
  };

  const handleStepDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    const dateStr = d.toISOString().split('T')[0];
    if (dateStr > todayStr) {
      setErrorMessage('Future dates are not permitted.');
      return;
    }
    handleDateChange(dateStr);
  };

  // Pricing calculations
  const calculatedBillPaise = useMemo(() => {
    if (!selectedCustomer) return 0;
    let sum = 0;
    initialData.products.forEach((p) => {
      const pkgs = parseInt(quantities[p.id] || '0', 10);
      if (pkgs > 0) {
        const ratePaise = selectedCustomer.rates[p.id] ?? (p.rates[0]?.rate || 0);
        sum += pkgs * ratePaise;
      }
    });
    return sum;
  }, [selectedCustomer, quantities, initialData.products]);

  const receivedPaise = Math.round((parseFloat(receivedAmount) || 0) * 100);
  const previousDuePaise = selectedCustomer?.currentOutstandingPaise || 0;
  const projectedRemainingDuePaise = previousDuePaise + calculatedBillPaise - receivedPaise;

  const handleSelectCustomer = (c: CustomerItem) => {
    setSelectedCustomerId(c.id);
    setCustomerSearch(`${c.customerName}${c.firmName ? ` (${c.firmName})` : ''}`);
    setDropdownOpen(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleClearForm = () => {
    setSelectedCustomerId('');
    setCustomerSearch('');
    setQuantities({});
    setReceivedAmount('');
    setRemarks('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDate > todayStr) {
      setErrorMessage('Future dates are not permitted. Please select today or a past date.');
      return;
    }
    if (!selectedCustomerId) {
      setErrorMessage('Please select a customer');
      return;
    }

    const items = initialData.products
      .map((p) => ({
        productId: p.id,
        crates: parseInt(quantities[p.id] || '0', 10),
      }))
      .filter((i) => i.crates > 0);

    const recAmt = parseFloat(receivedAmount) || 0;

    if (items.length === 0 && recAmt <= 0) {
      setErrorMessage('Please enter either product quantities or a payment amount');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await saveAdminEntryTransaction({
        customerId: selectedCustomerId,
        date: selectedDate,
        items,
        receivedAmount: recAmt,
        paymentMethod,
        remarks: remarks.trim() || undefined,
      });

      if (result.error) {
        setErrorMessage(result.error);
      } else {
        setSuccessMessage(
          `Transaction saved successfully for ${selectedCustomer?.customerName} on ${selectedDate}`
        );
        handleClearForm();
        router.refresh();
      }
    } catch {
      setErrorMessage('Failed to save transaction. Please check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverseEntry = async (entry: SavedEntryItem) => {
    const confirmMsg = `Are you sure you want to reverse the transaction for "${entry.customerName}" on ${selectedDate}? This will remove the recorded sale/collection and restore the customer's previous ledger balance.`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await reverseAdminEntryTransaction({
        customerId: entry.customerId,
        saleIds: entry.sales.map((s) => s.id),
        paymentIds: entry.payments.map((p) => p.id),
      });

      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    } catch {
      alert('Failed to reverse transaction');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Universal Date Selector Capsule */}
      <div className="bg-surface-raised shadow-raised p-5 sm:p-6 rounded-2xl border border-border/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Admin Entry</h1>
                <Badge variant="teal" size="sm">Main Customers Sync</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Record product quantities and payments directly into authoritative customer ledgers
              </p>
            </div>
          </div>
        </div>

        {/* Selected-Date Selector Capsule */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="inline-flex items-center bg-surface-inset shadow-inset px-3 py-2 rounded-xl border border-border/40 gap-2 w-full sm:w-auto justify-between">
            <button
              onClick={() => handleStepDay(-1)}
              title="Previous Day"
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-1">
              <Calendar className="w-4 h-4 text-primary" />
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => handleDateChange(e.target.value)}
                className="text-xs sm:text-sm font-bold bg-transparent border-none focus:outline-none text-foreground cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleStepDay(1)}
              disabled={selectedDate >= todayStr}
              title={selectedDate >= todayStr ? "Future dates not permitted" : "Next Day"}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Date Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Total Sales ({selectedDate})
          </p>
          <p className="text-xl font-bold tracking-tight text-primary tabular-nums">
            {formatMoney(initialData.daySummary.totalSalesPaise)}
          </p>
        </div>

        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Collections Received
          </p>
          <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatMoney(initialData.daySummary.totalReceivedPaise)}
          </p>
        </div>

        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Net Due from Date
          </p>
          <p className="text-xl font-bold tracking-tight text-destructive tabular-nums">
            {formatMoney(initialData.daySummary.netDuePaise)}
          </p>
        </div>

        <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Total PKGs Sold
          </p>
          <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {formatNumber(initialData.daySummary.totalPKGs)}
          </p>
        </div>

        <div className="col-span-2 md:col-span-1 bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Accounts Served
          </p>
          <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {initialData.daySummary.accountsCount}
          </p>
        </div>
      </div>

      {/* Main Form: Record Customer Entry */}
      <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 p-5 sm:p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Record Transaction for{' '}
              <span className="text-primary font-mono">{selectedDate}</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select any existing customer to automatically load custom product rates and previous balance
            </p>
          </div>
          {selectedCustomer && (
            <button
              type="button"
              onClick={handleClearForm}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground underline"
            >
              Reset Form
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Customer Autocomplete Search */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Step 1: Select Customer from Directory
            </label>
            <div className="relative">
              <div className="flex items-center gap-2 bg-surface-inset shadow-inset rounded-xl border border-border/40 px-3.5 py-2.5">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search by customer name, shop/firm, code, area, or phone..."
                  value={customerSearch}
                  onFocus={() => setDropdownOpen(true)}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setDropdownOpen(true);
                  }}
                  className="w-full text-xs sm:text-sm font-semibold bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground/60"
                />
              </div>

              {/* Dropdown Options */}
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto bg-surface-overlay shadow-modal border border-border/40 rounded-xl divide-y divide-border/30">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-4 text-xs text-center text-muted-foreground">
                      No matching customers found.
                    </div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="p-3 hover:bg-surface-inset cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-foreground">
                            {c.customerName}
                            {c.firmName && <span className="font-medium text-muted-foreground"> ({c.firmName})</span>}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {c.areaName}
                            </span>
                            <span>•</span>
                            <span>{c.routeName}</span>
                            {c.code && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-primary font-bold">{c.code}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Due</span>
                          <span className={`font-bold tabular-nums ${c.currentOutstandingPaise > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                            {formatMoney(c.currentOutstandingPaise)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected Customer Card Preview */}
            {selectedCustomer && (
              <div className="p-4 rounded-xl bg-surface-inset border border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-foreground">{selectedCustomer.customerName}</span>
                    {selectedCustomer.firmName && (
                      <Badge variant="teal" size="sm">{selectedCustomer.firmName}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Route: <strong className="text-foreground">{selectedCustomer.routeName}</strong></span>
                    <span>•</span>
                    <span>Area: <strong className="text-foreground">{selectedCustomer.areaName}</strong></span>
                    <span>•</span>
                    <span>Phone: <strong className="text-foreground">{selectedCustomer.contact}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground block">
                      Previous Ledger Balance
                    </span>
                    <span className={`text-base font-bold tabular-nums ${selectedCustomer.currentOutstandingPaise > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatMoney(selectedCustomer.currentOutstandingPaise)}
                    </span>
                  </div>

                  <Link
                    href={`/dashboard/admin/customers/${selectedCustomer.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-raised border border-border/40 text-xs font-semibold text-primary hover:bg-surface-raised/80 transition-all shadow-raised-sm whitespace-nowrap"
                  >
                    <span>View Ledger</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Product Quantities & Line Calculations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Step 2: Enter Product Quantities (PKGs)
              </label>
              <span className="text-xs text-muted-foreground">
                Rates auto-resolved from customer-specific pricing
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {initialData.products.map((p) => {
                const applicableRatePaise = selectedCustomer?.rates[p.id] ?? (p.rates[0]?.rate || 0);
                const pkgs = parseInt(quantities[p.id] || '0', 10);
                const lineTotalPaise = pkgs * applicableRatePaise;

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-border/40 bg-surface-inset shadow-inset flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{p.name}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {p.bottlesPerCrate} btl/PKG
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Rate: <strong className="text-foreground">{formatMoney(applicableRatePaise)}</strong> / PKG
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          placeholder="0 PKGs"
                          value={quantities[p.id] || ''}
                          onChange={(e) => setQuantities({ ...quantities, [p.id]: e.target.value })}
                          className="w-full text-sm font-bold bg-surface-raised border border-border/40 rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 tabular-nums"
                        />
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground tabular-nums">
                        Line: <strong className="text-primary">{formatMoney(lineTotalPaise)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Payment & Financial Summary Strip */}
          <div className="p-4 sm:p-5 rounded-xl bg-surface-inset/60 border border-border/40 space-y-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Step 3: Collection Received & Ledger Reconciliation
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Payment Received Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Collection Received (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    className="w-full text-sm font-bold bg-surface-raised border border-border/40 rounded-xl pl-8 pr-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 tabular-nums"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Payment Mode
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full text-xs font-semibold bg-surface-raised border border-border/40 rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other Adjustment</option>
                </select>
              </div>

              {/* Remarks / Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Remarks / Reference Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delivered by van, payment via GPay"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full text-xs font-semibold bg-surface-raised border border-border/40 rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {/* Reconciliation Preview Strip */}
            <div className="pt-3 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] uppercase">Previous Due</span>
                <span className="font-bold text-foreground tabular-nums text-sm">
                  {formatMoney(previousDuePaise)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] uppercase">+ New Bill Amount</span>
                <span className="font-bold text-primary tabular-nums text-sm">
                  {formatMoney(calculatedBillPaise)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] uppercase">- Amount Received</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                  {formatMoney(receivedPaise)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] uppercase">= Net Remaining Due</span>
                <span className={`font-extrabold tabular-nums text-base ${projectedRemainingDuePaise > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatMoney(projectedRemainingDuePaise)}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClearForm}
              className="text-xs px-4 py-2.5"
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedCustomerId}
              className="text-xs px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-raised hover:shadow-raised-sm gap-2"
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <span>Save Transaction for {selectedDate}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Saved Entries Section for Selected Date */}
      <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Saved Entries for <span className="text-primary font-mono">{selectedDate}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Authoritative records saved on this date across customer accounts ({initialData.savedEntries.length} entries)
            </p>
          </div>
          <div className="text-xs font-semibold text-muted-foreground">
            Total PKGs: <strong className="text-foreground">{formatNumber(initialData.daySummary.totalPKGs)}</strong> • Total Sales:{' '}
            <strong className="text-primary">{formatMoney(initialData.daySummary.totalSalesPaise)}</strong>
          </div>
        </div>

        {initialData.savedEntries.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<ReceiptText className="w-8 h-8 text-primary" />}
              title={`No Entries Recorded on ${selectedDate}`}
              description="Select a customer above to log new sales, deliveries, or payments for this date."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap">
              <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="px-4 py-3.5">Customer & Area</th>
                  {initialData.products.map((p) => (
                    <th key={p.id} className="px-3 py-3.5 text-center">{p.name}</th>
                  ))}
                  <th className="px-3 py-3.5 text-center">Total PKGs</th>
                  <th className="px-4 py-3.5 text-right">Bill Amount</th>
                  <th className="px-4 py-3.5 text-right">Received</th>
                  <th className="px-4 py-3.5 text-right">Net Due</th>
                  <th className="px-4 py-3.5">Payment & Remarks</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-surface-raised">
                {initialData.savedEntries.map((entry) => (
                  <tr key={entry.customerId} className="hover:bg-surface-inset/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span>{entry.customerName}</span>
                        {entry.firmName && (
                          <span className="text-xs font-medium text-muted-foreground">({entry.firmName})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        <span>{entry.routeName}</span> • <span>{entry.areaName}</span>
                      </div>
                    </td>

                    {initialData.products.map((p) => (
                      <td key={p.id} className="px-3 py-3.5 text-center text-muted-foreground tabular-nums">
                        {entry.productQuantities[p.id] ? (
                          <strong className="text-foreground">{entry.productQuantities[p.id]}</strong>
                        ) : (
                          '—'
                        )}
                      </td>
                    ))}

                    <td className="px-3 py-3.5 text-center font-bold text-foreground tabular-nums">
                      {entry.totalPKGs > 0 ? entry.totalPKGs : '—'}
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-primary tabular-nums">
                      {entry.totalBillPaise > 0 ? formatMoney(entry.totalBillPaise) : '—'}
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {entry.totalReceivedPaise > 0 ? formatMoney(entry.totalReceivedPaise) : '—'}
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-destructive tabular-nums">
                      {entry.netDuePaise > 0 ? formatMoney(entry.netDuePaise) : '—'}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <div>
                        {entry.paymentMethods.length > 0 ? (
                          <span className="font-semibold text-foreground">
                            {entry.paymentMethods.join(', ')}
                          </span>
                        ) : (
                          'Unpaid / Credit'
                        )}
                      </div>
                      {entry.remarks && (
                        <div className="text-[11px] truncate max-w-[180px]">{entry.remarks}</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/dashboard/admin/customers/${entry.customerId}`}
                          target="_blank"
                          title="View Customer Ledger"
                          className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleReverseEntry(entry)}
                          title="Reverse Entry"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

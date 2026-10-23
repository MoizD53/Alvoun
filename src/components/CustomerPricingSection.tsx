'use client';

import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  Check, 
  RotateCcw, 
  Edit2, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Package,
  ArrowRight
} from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { 
  getCustomerProductRates, 
  setCustomerProductRate, 
  resetCustomerProductRate,
  type CustomerProductRateItem 
} from '@/lib/actions/admin/customer-pricing';
import { Badge } from '@/components/ui/badge';

interface CustomerPricingSectionProps {
  customerId: string;
  customerName: string;
}

export default function CustomerPricingSection({
  customerId,
  customerName,
}: CustomerPricingSectionProps) {
  const [rates, setRates] = useState<CustomerProductRateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editing state: productId -> rupees string
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPriceRupees, setEditPriceRupees] = useState<string>('');
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  const fetchRates = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getCustomerProductRates(customerId);
      if (res.success && res.rates) {
        setRates(res.rates);
      } else {
        setErrorMsg(res.error || 'Failed to fetch customer rates');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading product pricing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [customerId]);

  const startEdit = (item: CustomerProductRateItem) => {
    setEditingProductId(item.productId);
    // Pre-fill with existing custom rate or standard rate in Rupees
    const currentRupees = (
      (item.customerRatePaise ?? item.standardRatePaise) / 100
    ).toString();
    setEditPriceRupees(currentRupees);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setEditPriceRupees('');
  };

  const handleSaveRate = async (productId: string) => {
    const num = parseFloat(editPriceRupees);
    if (isNaN(num) || num < 0) {
      setErrorMsg('Please enter a valid non-negative rate in Rupees.');
      return;
    }

    const ratePaise = Math.round(num * 100);
    setSavingProductId(productId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await setCustomerProductRate({
        customerId,
        productId,
        ratePaise,
      });

      if (res.success) {
        setSuccessMsg(res.message || 'Rate updated successfully.');
        setEditingProductId(null);
        await fetchRates();
      } else {
        setErrorMsg(res.error || 'Failed to save rate.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update rate');
    } finally {
      setSavingProductId(null);
    }
  };

  const handleResetRate = async (productId: string) => {
    if (!confirm('Are you sure you want to reset this product to the standard company rate?')) {
      return;
    }

    setSavingProductId(productId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await resetCustomerProductRate({
        customerId,
        productId,
      });

      if (res.success) {
        setSuccessMsg(res.message || 'Reset to standard rate.');
        setEditingProductId(null);
        await fetchRates();
      } else {
        setErrorMsg(res.error || 'Failed to reset rate.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset rate');
    } finally {
      setSavingProductId(null);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-default/60">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tight font-sans">
            Customer Product Pricing
          </h2>
          <p className="text-sm sm:text-base text-secondary font-medium mt-1">
            Configure customized crate prices for <strong className="text-primary">{customerName}</strong>. If no custom rate is specified, standard product rate applies automatically.
          </p>
        </div>

        <button
          onClick={fetchRates}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-secondary hover:text-primary bg-surface-raised border border-border-default shadow-raised rounded-xl transition-all self-start sm:self-auto cursor-pointer"
          title="Refresh rates"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-danger-bg border border-danger/30 text-danger text-sm font-semibold animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-success-bg border border-success/30 text-success text-sm font-semibold animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Pricing Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-secondary">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700 dark:text-teal-400 mb-2" />
          <p className="text-sm font-semibold">Loading product rates...</p>
        </div>
      ) : rates.length === 0 ? (
        <div className="p-8 text-center bg-surface-inset rounded-2xl border border-border-default text-secondary">
          <p className="text-base font-bold">No active products found in catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {rates.map((item) => {
            const isEditing = editingProductId === item.productId;
            const isSaving = savingProductId === item.productId;

            return (
              <div
                key={item.productId}
                className={`bg-surface-raised border rounded-2xl p-5 shadow-raised transition-all duration-200 flex flex-col justify-between ${
                  item.isCustomized
                    ? 'border-teal-600/40 shadow-hover'
                    : 'border-border-default'
                }`}
              >
                <div>
                  {/* Top Bar: Product Name + Customized Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-primary tracking-tight">
                          {item.productName}
                        </h3>
                        <span className="text-xs font-semibold text-secondary">
                          {item.bottlesPerCrate} bottles / crate (PKG)
                        </span>
                      </div>
                    </div>

                    {item.isCustomized ? (
                      <Badge variant="teal" styleType="subtle" size="sm" dot>
                        Custom Rate
                      </Badge>
                    ) : (
                      <Badge variant="neutral" styleType="subtle" size="sm">
                        Standard
                      </Badge>
                    )}
                  </div>

                  {/* Rate Display / Comparison */}
                  <div className="bg-surface-inset shadow-inset rounded-xl p-3.5 border border-border-default/60 space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
                      <span className="text-secondary">Standard Rate:</span>
                      <span className=" font-bold text-secondary tabular-nums">
                        {formatMoney(item.standardRatePaise)} / crate
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm sm:text-base font-bold pt-1 border-t border-border-default/60">
                      <span className="text-primary">Effective Rate:</span>
                      <span
                        className={` text-base sm:text-lg font-black tracking-tight tabular-nums ${
                          item.isCustomized
                            ? 'text-teal-800 dark:text-teal-300'
                            : 'text-primary'
                        }`}
                      >
                        {formatMoney(item.effectiveRatePaise)}
                        <span className="text-xs font-normal text-secondary ml-1">/ crate</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit Form or Action Buttons */}
                <div className="pt-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-secondary font-bold text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPriceRupees}
                          onChange={(e) => setEditPriceRupees(e.target.value)}
                          disabled={isSaving}
                          placeholder="Rate in ₹"
                          className="w-full pl-8 pr-3 py-2 text-sm sm:text-base font-bold  bg-surface-inset border border-teal-500 rounded-xl shadow-inset text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          autoFocus
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveRate(item.productId)}
                          disabled={isSaving}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs sm:text-sm shadow-raised transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          <span>Save Rate</span>
                        </button>

                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-surface-raised border border-border-default text-secondary hover:text-primary text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        disabled={isSaving}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-raised hover:bg-surface-inset border border-border-default text-primary font-bold text-xs sm:text-sm shadow-raised transition-all cursor-pointer active:scale-95"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                        <span>{item.isCustomized ? 'Modify Rate' : 'Set Custom Rate'}</span>
                      </button>

                      {item.isCustomized && (
                        <button
                          type="button"
                          onClick={() => handleResetRate(item.productId)}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-surface-raised hover:bg-danger-bg/50 border border-border-default hover:border-danger/40 text-danger text-xs font-semibold shadow-raised transition-all cursor-pointer"
                          title="Reset to standard rate"
                        >
                          {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">Reset</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

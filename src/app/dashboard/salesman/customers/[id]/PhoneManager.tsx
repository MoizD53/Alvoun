'use client';

import { useState } from 'react';
import { Phone, Check, Loader2, Pencil } from 'lucide-react';
import { updateCustomerPhone } from '@/lib/actions/salesman/customer';

function isMissingPhone(val: string | null | undefined): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  return trimmed === '' || trimmed === '0' || trimmed.toLowerCase() === 'n/a';
}

export default function PhoneManager({
  customerId,
  initialPhone,
}: {
  customerId: string;
  initialPhone: string;
}) {
  const [phone, setPhone] = useState(isMissingPhone(initialPhone) ? '' : initialPhone.trim());
  const [isEditing, setIsEditing] = useState(false);
  const [inputPhone, setInputPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const isCurrentlyMissing = isMissingPhone(phone);

  const startAdd = () => {
    setInputPhone('');
    setError(null);
    setIsEditing(true);
  };

  const startEdit = () => {
    setInputPhone(phone);
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setError(null);
    const cleaned = inputPhone.trim();

    if (!cleaned) {
      setError('Phone number is required');
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(cleaned) && !/^\d{10}$/.test(cleaned)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateCustomerPhone(customerId, cleaned);
      if (res?.error) {
        throw new Error(res.error);
      }
      setPhone(cleaned);
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save phone number');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center shrink-0">
          <Phone className="h-5 w-5 text-brand-teal" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5">
            Phone
          </div>

          {success ? (
            <div className="font-bold text-emerald-600 dark:text-emerald-400 text-lg flex items-center gap-1.5 py-0.5">
              <Check className="h-5 w-5" /> Saved successfully
            </div>
          ) : (
            <div className={`font-black text-lg ${isCurrentlyMissing ? 'text-text-muted' : 'text-text-primary'}`}>
              {isCurrentlyMissing ? 'Not available' : phone}
            </div>
          )}

          {/* Missing Phone: Show [+ Add Phone Number] */}
          {isCurrentlyMissing && !isEditing && (
            <div className="mt-2">
              <button
                type="button"
                onClick={startAdd}
                className="min-h-[44px] inline-flex items-center text-xs font-bold text-brand-teal bg-brand-teal/10 hover:bg-brand-teal/20 border border-brand-teal/30 px-3.5 py-2 rounded-xl active:scale-95 shadow-raised-sm transition-all"
              >
                + Add Phone Number
              </button>
            </div>
          )}

          {/* Existing Phone Actions: [ CALL ] [ EDIT ] */}
          {!isCurrentlyMissing && !isEditing && (
            <div className="flex items-center gap-2 mt-2.5">
              <a
                href={`tel:${phone}`}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold shadow-raised-sm active:scale-95 transition-all"
              >
                <Phone className="h-3.5 w-3.5" />
                CALL
              </a>
              <button
                type="button"
                onClick={startEdit}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-raised shadow-raised-sm hover:shadow-raised active:shadow-inset border border-border-subtle text-text-secondary rounded-xl text-xs font-bold active:scale-95 transition-all"
              >
                <Pencil className="h-3.5 w-3.5" />
                EDIT
              </button>
            </div>
          )}

          {/* Mobile-friendly Add/Edit Phone Form */}
          {isEditing && (
            <div className="mt-3 space-y-3 p-4 bg-surface-sunken shadow-inset rounded-2xl border border-border-subtle animate-fade-in">
              <div className="text-xs font-bold text-text-primary">
                {isCurrentlyMissing ? 'Add Customer Phone' : 'Edit Customer Phone'}
              </div>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 10-digit number"
                value={inputPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setInputPhone(val);
                  if (error) setError(null);
                }}
                className="w-full px-3.5 py-3 bg-surface-raised border border-border-subtle rounded-xl text-base font-bold tracking-wide text-text-primary focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal outline-none"
                maxLength={10}
                autoFocus
              />
              {error && <div className="text-xs font-medium text-accent-terracotta">{error}</div>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 min-h-[44px] bg-brand-teal hover:bg-brand-teal-dark text-white font-bold text-sm py-2.5 rounded-xl shadow-raised active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-1.5"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setError(null); }}
                  disabled={isSaving}
                  className="flex-1 min-h-[44px] bg-surface-raised shadow-raised-sm hover:shadow-raised border border-border-subtle text-text-secondary font-bold text-sm py-2.5 rounded-xl active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Primary Call Action Button */}
      {!isCurrentlyMissing && !isEditing && (
        <div className="mt-6 mb-2">
          <a
            href={`tel:${phone}`}
            className="min-h-[52px] flex items-center justify-center gap-2.5 w-full py-3.5 bg-surface-raised border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/10 rounded-2xl font-bold active:scale-[0.98] transition-all shadow-raised-sm text-sm"
          >
            <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            CALL CUSTOMER ({phone})
          </a>
        </div>
      )}
    </>
  );
}

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
        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
          <Phone className="h-5 w-5 text-alvoun-blue" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
            Phone
          </div>

          {success ? (
            <div className="font-bold text-alvoun-green text-lg flex items-center gap-1.5 py-0.5">
              <Check className="h-5 w-5" /> Saved successfully
            </div>
          ) : (
            <div className={`font-bold text-lg ${isCurrentlyMissing ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
              {isCurrentlyMissing ? 'Not available' : phone}
            </div>
          )}

          {/* Missing Phone: Show [+ Add Phone Number] */}
          {isCurrentlyMissing && !isEditing && (
            <div className="mt-2">
              <button
                type="button"
                onClick={startAdd}
                className="inline-flex items-center text-sm font-bold text-alvoun-blue bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg active:bg-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-alvoun-green hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg text-xs font-bold active:bg-green-200 transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                CALL
              </a>
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold active:bg-slate-300 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                EDIT
              </button>
            </div>
          )}

          {/* Mobile-friendly Add/Edit Phone Form */}
          {isEditing && (
            <div className="mt-3 space-y-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
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
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-base font-medium tracking-wide focus:ring-2 focus:ring-alvoun-blue outline-none"
                maxLength={10}
                autoFocus
              />
              {error && <div className="text-xs font-medium text-red-500">{error}</div>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-alvoun-blue text-white font-bold text-sm py-2.5 rounded-lg active:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-1.5"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setError(null); }}
                  disabled={isSaving}
                  className="flex-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold text-sm py-2.5 rounded-lg active:bg-slate-100 dark:active:bg-slate-700 transition-colors"
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
            className="flex items-center justify-center gap-2.5 w-full py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-green-500 hover:text-alvoun-green rounded-xl font-bold active:bg-slate-50 dark:active:bg-slate-900 transition-all shadow-sm text-base"
          >
            <Phone className="h-5 w-5 text-alvoun-green" />
            CALL CUSTOMER ({phone})
          </a>
        </div>
      )}
    </>
  );
}

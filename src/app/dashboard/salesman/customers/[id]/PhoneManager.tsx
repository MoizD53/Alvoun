'use client';

import { useState } from 'react';
import { Phone, Check, Loader2 } from 'lucide-react';
import { updateCustomerPhone } from '@/lib/actions/salesman/customer';

export default function PhoneManager({
  customerId,
  initialPhone,
}: {
  customerId: string;
  initialPhone: string;
}) {
  const isMissing = !initialPhone || initialPhone === '0' || initialPhone.trim() === '' || initialPhone.toLowerCase() === 'n/a';
  
  const [phone, setPhone] = useState(isMissing ? '' : initialPhone);
  const [isEditing, setIsEditing] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setError(null);
    const cleaned = newPhone.trim();
    
    if (!cleaned) {
      setError('Phone number is required');
      return;
    }

    // Basic validation for 10 digits
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(cleaned)) {
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

  const displayPhone = (!phone || phone === '0' || phone.toLowerCase() === 'n/a') ? 'Phone number not available' : phone;
  const isCurrentlyMissing = (!phone || phone === '0' || phone.toLowerCase() === 'n/a');

  return (
    <>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
          <Phone className="h-5 w-5 text-alvoun-blue" />
        </div>
        <div className="flex-1">
          {success ? (
            <div className="font-bold text-alvoun-green text-lg flex items-center gap-1">
              <Check className="h-5 w-5" /> Saved successfully
            </div>
          ) : (
            <div className={`font-bold text-lg ${isCurrentlyMissing ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
              {displayPhone}
            </div>
          )}
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Contact Number</div>
          
          {isCurrentlyMissing && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="mt-2 text-sm font-bold text-alvoun-blue bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg active:bg-blue-100 transition-colors"
            >
              + Add Phone Number
            </button>
          )}

          {isEditing && (
            <div className="mt-3 space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <input
                type="tel"
                placeholder="Enter 10-digit number"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-alvoun-blue outline-none"
                maxLength={10}
              />
              {error && <div className="text-xs font-medium text-red-500">{error}</div>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-alvoun-blue text-white font-bold text-sm py-2 rounded-lg active:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </button>
                <button
                  onClick={() => { setIsEditing(false); setError(null); }}
                  disabled={isSaving}
                  className="flex-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold text-sm py-2 rounded-lg active:bg-slate-100 dark:active:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Call Action - only show if phone is available and not editing */}
      {!isCurrentlyMissing && !isEditing && (
        <div className="mt-6 mb-4">
          <a href={`tel:${phone}`} className="flex items-center justify-center gap-2 w-full py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold active:bg-slate-50 dark:active:bg-slate-900 transition-colors shadow-sm text-base">
            <Phone className="h-5 w-5 text-slate-400" />
            CALL CUSTOMER
          </a>
        </div>
      )}
    </>
  );
}

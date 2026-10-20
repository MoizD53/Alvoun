import { Clock, Building2, Shield, DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-static';

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in-up pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard/admin" 
          className="w-10 h-10 flex items-center justify-center bg-surface-raised rounded-2xl shadow-raised-sm border border-border-subtle text-text-primary active:shadow-inset active:scale-95 transition-all"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">System Settings</h1>
          <p className="text-xs font-semibold text-text-muted mt-0.5">Application configuration, operational hours, and business guardrails.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Business Profile */}
        <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle overflow-hidden">
          <div className="p-5 border-b border-border-subtle flex items-center gap-3 bg-surface/80">
            <div className="w-10 h-10 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center text-brand-teal">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-text-primary tracking-tight">Business Profile</h2>
              <p className="text-xs font-semibold text-text-muted">Enterprise identity details</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-4 bg-surface-sunken shadow-inset rounded-2xl border border-border-subtle">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Company Name</label>
              <div className="text-lg font-black text-text-primary tracking-wide">ALVOUN</div>
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle overflow-hidden">
          <div className="p-5 border-b border-border-subtle flex items-center gap-3 bg-surface/80">
            <div className="w-10 h-10 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center text-brand-teal">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-text-primary tracking-tight">Working Hours</h2>
              <p className="text-xs font-semibold text-text-muted">Automated field staff shifts</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-surface-sunken shadow-inset rounded-2xl border border-border-subtle">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Login Starts</label>
                <div className="text-base font-black text-text-primary">07:00 AM</div>
              </div>
              <div className="p-4 bg-surface-sunken shadow-inset rounded-2xl border border-border-subtle">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Auto-Logout</label>
                <div className="text-base font-black text-text-primary">07:00 PM</div>
              </div>
            </div>
            <div className="p-4 bg-surface-sunken shadow-inset rounded-2xl border border-border-subtle">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">System Timezone</label>
              <div className="text-sm font-black text-text-primary">Asia/Kolkata (IST)</div>
              <p className="text-xs text-text-muted font-medium mt-1">Shift window is strictly verified against Indian Standard Time.</p>
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle overflow-hidden">
          <div className="p-5 border-b border-border-subtle flex items-center gap-3 bg-surface/80">
            <div className="w-10 h-10 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center text-brand-teal">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-text-primary tracking-tight">Financial Settings</h2>
              <p className="text-xs font-semibold text-text-muted">Currency and transaction rules</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-4 bg-surface-sunken shadow-inset rounded-2xl border border-border-subtle">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Base Currency</label>
              <div className="text-base font-black text-text-primary">INR (₹) — Indian Rupee</div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle overflow-hidden">
          <div className="p-5 border-b border-border-subtle flex items-center gap-3 bg-surface/80">
            <div className="w-10 h-10 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center text-brand-teal">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-text-primary tracking-tight">Security & Sessions</h2>
              <p className="text-xs font-semibold text-text-muted">Authentication and API shields</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-4 bg-surface-sunken shadow-inset rounded-2xl border border-border-subtle">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Session Guard</label>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-black">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active (Centralized JWT & DB Guard)
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

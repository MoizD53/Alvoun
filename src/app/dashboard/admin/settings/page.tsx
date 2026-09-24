import { Clock, Building2, Shield, DollarSign } from 'lucide-react';

export const dynamic = 'force-static';

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in-up pb-24">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">System Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">View current application configuration and business rules.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Business Profile */}
        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-alvoun-blue" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Business Profile</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Company Name</label>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">ALVOUN</div>
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <Clock className="h-5 w-5 text-alvoun-blue" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Working Hours</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Salesman Login Starts</label>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">07:00 AM</div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Salesman Auto-Logout</label>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">07:00 PM</div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">System Timezone</label>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">Asia/Kolkata (IST)</div>
              <p className="text-xs text-slate-500 mt-1">These settings are enforced securely by the server.</p>
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-alvoun-blue" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Financial Settings</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Base Currency</label>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">INR (₹)</div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <Shield className="h-5 w-5 text-alvoun-blue" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Security</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Session Guard</label>
              <div className="text-sm font-semibold text-green-600 mt-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Active (Centralized JWT & DB Guard)
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSalesmanAccount, updateSalesmanAccount } from '@/lib/actions/admin/salesman-management';
import { Save, ArrowLeft, Loader2, EyeOff, Eye } from 'lucide-react';
import Link from 'next/link';

export default function SalesmanForm({ 
  initialData, 
  routes 
}: { 
  initialData?: any;
  routes: any[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    employeeCode: initialData?.employeeCode || '',
    loginId: initialData?.profile?.email || '',
    password: '',
    routeId: initialData?.routes?.[0]?.id || '',
    isActive: initialData !== undefined ? initialData.isActive : true,
  });

  const isEditing = !!initialData;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        const result = await updateSalesmanAccount(initialData.id, formData);
        if (result.error) throw new Error(result.error);
        router.push(`/dashboard/admin/salesmen/${initialData.id}`);
      } else {
        const result = await createSalesmanAccount(formData);
        if (result.error) throw new Error(result.error);
        router.push('/dashboard/admin/salesmen');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {isEditing ? 'Edit Salesman Profile' : 'New Salesman Account'}
        </h2>
        <Link href={isEditing ? `/dashboard/admin/salesmen/${initialData.id}` : "/dashboard/admin/salesmen"} className="text-sm text-slate-500 hover:text-slate-700 flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-alvoun-blue focus:border-alvoun-blue dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Phone Number *
            </label>
            <input
              type="text"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-alvoun-blue focus:border-alvoun-blue dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Employee Code *
            </label>
            <input
              type="text"
              name="employeeCode"
              required
              value={formData.employeeCode}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-alvoun-blue focus:border-alvoun-blue dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Assigned Route
            </label>
            <select
              name="routeId"
              value={formData.routeId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-alvoun-blue focus:border-alvoun-blue dark:bg-slate-900 dark:text-white"
            >
              <option value="">No Route</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.city?.name})</option>
              ))}
            </select>
          </div>
        </div>

        <hr className="border-slate-200 dark:border-slate-800" />
        
        <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 uppercase tracking-wider">Login Credentials</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Login ID *
            </label>
            <input
              type="text"
              name="loginId"
              required
              value={formData.loginId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-alvoun-blue focus:border-alvoun-blue dark:bg-slate-900 dark:text-white"
            />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-alvoun-blue focus:border-alvoun-blue dark:bg-slate-900 dark:text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="h-4 w-4 text-alvoun-blue border-gray-300 rounded focus:ring-alvoun-blue"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-slate-900 dark:text-slate-100">
            Active Business Status
          </label>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-alvoun-blue hover:bg-alvoun-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-alvoun-blue transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Salesman</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

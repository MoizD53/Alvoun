'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSalesmanAccount, updateSalesmanAccount } from '@/lib/actions/admin/salesman-management';
import { Save, ArrowLeft, Loader2, EyeOff, Eye, MapPin, CheckSquare, Square, ShieldCheck, Map } from 'lucide-react';
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

  // Initial assigned area IDs from existing assignments
  const initialAreaIds: string[] = initialData?.assignments?.map((a: any) => a.areaId) || [];

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    employeeCode: initialData?.employeeCode || '',
    loginId: initialData?.profile?.email || '',
    password: '',
    routeId: initialData?.routes?.[0]?.id || initialData?.assignments?.[0]?.routeId || (routes.length > 0 ? routes[0].id : ''),
    isActive: initialData !== undefined ? initialData.isActive : true,
  });

  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>(initialAreaIds);

  const isEditing = !!initialData;

  const currentRoute = routes.find(r => r.id === formData.routeId);
  const currentRouteAreas: any[] = currentRoute?.areas || [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleToggleArea = (areaId: string) => {
    setSelectedAreaIds(prev => 
      prev.includes(areaId) ? prev.filter(id => id !== areaId) : [...prev, areaId]
    );
  };

  const handleSelectAllCurrentRouteAreas = () => {
    const areaIdsToAdd = currentRouteAreas.map(a => a.id);
    setSelectedAreaIds(prev => Array.from(new Set([...prev, ...areaIdsToAdd])));
  };

  const handleDeselectAllCurrentRouteAreas = () => {
    const areaIdsToRemove = new Set(currentRouteAreas.map(a => a.id));
    setSelectedAreaIds(prev => prev.filter(id => !areaIdsToRemove.has(id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      ...formData,
      areaIds: selectedAreaIds,
    };

    try {
      if (isEditing) {
        const result = await updateSalesmanAccount(initialData.id, payload);
        if (result.error) throw new Error(result.error);
        router.push(`/dashboard/admin/salesmen/${initialData.id}`);
      } else {
        const result = await createSalesmanAccount(payload);
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
    <div className="max-w-3xl bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isEditing ? 'Edit Salesman Profile & Territory' : 'Create Salesman Account & Territory'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Admin credentials and territory allocation configured in one place
          </p>
        </div>
        <Link 
          href={isEditing ? `/dashboard/admin/salesmen/${initialData.id}` : "/dashboard/admin/salesmen"} 
          className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* 1. Basic Info */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            1. Salesman Personal Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Ramesh Patel"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-alvoun-blue focus:border-alvoun-blue dark:bg-slate-900 dark:text-white text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Phone Number *
              </label>
              <input
                type="text"
                name="phone"
                required
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-alvoun-blue focus:border-alvoun-blue dark:bg-slate-900 dark:text-white text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Employee Code *
              </label>
              <input
                type="text"
                name="employeeCode"
                required
                placeholder="e.g. SLM001"
                value={formData.employeeCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-alvoun-blue focus:border-alvoun-blue dark:bg-slate-900 dark:text-white text-sm"
              />
            </div>
          </div>
        </section>

        <hr className="border-slate-200 dark:border-slate-800" />

        {/* 2. Login Credentials (Admin-Controlled ID & Pass) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-alvoun-blue" />
              2. Salesman App Credentials (Login ID & Password)
            </h3>
            <span className="text-xs text-alvoun-blue bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full font-medium">
              Admin Managed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Login ID *
              </label>
              <input
                type="text"
                name="loginId"
                required
                placeholder="e.g. ramesh / ramesh@alvoun.com"
                value={formData.loginId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-alvoun-blue focus:border-alvoun-blue dark:bg-slate-900 dark:text-white text-sm"
              />
              <p className="text-xs text-slate-400">The salesman will use this exact Login ID on the /login page</p>
            </div>

            {!isEditing ? (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    placeholder="Enter login password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-alvoun-blue focus:border-alvoun-blue dark:bg-slate-900 dark:text-white pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400">Secure password created by Admin</p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</div>
                  <div className="text-xs text-slate-400">Encrypted in database</div>
                </div>
                <span className="text-xs text-slate-500">Change via right-side panel</span>
              </div>
            )}
          </div>
        </section>

        <hr className="border-slate-200 dark:border-slate-800" />

        {/* 3. Territory: Route & Area Assignment */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              3. Territory Allocation (Routes & Areas)
            </h3>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
              {selectedAreaIds.length} {selectedAreaIds.length === 1 ? 'Area' : 'Areas'} Allocated
            </span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Select Route *
              </label>
              <select
                name="routeId"
                value={formData.routeId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-alvoun-blue focus:border-alvoun-blue dark:bg-slate-900 dark:text-white text-sm"
              >
                <option value="">-- Choose a Route --</option>
                {routes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.city?.name ? `(${r.city.name})` : ''} - {r.areas?.length || 0} Areas
                  </option>
                ))}
              </select>
            </div>

            {/* Areas under selected Route */}
            {currentRoute && (
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Map className="w-4 h-4 text-alvoun-blue" />
                    Areas in {currentRoute.name}
                  </div>
                  {currentRouteAreas.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllCurrentRouteAreas}
                        className="text-xs font-medium text-alvoun-blue hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllCurrentRouteAreas}
                        className="text-xs font-medium text-slate-500 hover:underline"
                      >
                        Clear Route
                      </button>
                    </div>
                  )}
                </div>

                {currentRouteAreas.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                    No areas created under this route yet. You can create areas under Master Data &gt; Routes.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {currentRouteAreas.map((area: any) => {
                      const isChecked = selectedAreaIds.includes(area.id);
                      return (
                        <button
                          key={area.id}
                          type="button"
                          onClick={() => handleToggleArea(area.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors border ${
                            isChecked
                              ? 'bg-alvoun-blue/10 border-alvoun-blue text-alvoun-blue font-semibold'
                              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-alvoun-blue shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{area.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <hr className="border-slate-200 dark:border-slate-800" />

        {/* 4. Active Status */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="h-4 w-4 text-alvoun-blue border-gray-300 rounded focus:ring-alvoun-blue"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
            Active Status (Enables Login & Field Access)
          </label>
        </div>

        {/* Submit */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-alvoun-blue hover:bg-alvoun-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-alvoun-blue transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Salesman...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> {isEditing ? 'Save Changes' : 'Create Salesman & Assign Territory'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

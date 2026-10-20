'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSalesmanAccount, updateSalesmanAccount } from '@/lib/actions/admin/salesman-management';
import { 
  Save, ArrowLeft, EyeOff, Eye, MapPin, 
  CheckSquare, Square, ShieldCheck, Map, User, Phone 
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertBanner } from '@/components/ui/alert-banner';

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
    
    // Clear selected areas when route changes to prevent cross-route territory assignment
    if (name === 'routeId') {
      setSelectedAreaIds([]);
    }
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
        if (result?.error) throw new Error(result.error);
        router.push(`/dashboard/admin/salesmen/${initialData.id}`);
      } else {
        const result = await createSalesmanAccount(payload);
        if (result?.error) throw new Error(result.error);
        router.push('/dashboard/admin/salesmen');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <AlertBanner
          variant="danger"
          title="Could not save salesman"
          onClose={() => setError(null)}
        >
          {error}
        </AlertBanner>
      )}

      {/* 1. Basic Info */}
      <div className="bg-surface-raised shadow-raised rounded-2xl p-6 border border-border/40 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border/40">
          <User className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">1. Personal Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Ramesh Patel"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Phone Number <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="phone"
              required
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={handleChange}
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 2. Login Credentials */}
      <div className="bg-surface-raised shadow-raised rounded-2xl p-6 border border-border/40 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              2. Mobile App Credentials
            </h2>
          </div>
          <Badge variant="teal" size="sm">
            Admin Managed
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Login ID <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="loginId"
              required
              placeholder="e.g. ramesh / ramesh@alvoun.com"
              value={formData.loginId}
              onChange={handleChange}
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <p className="text-xs text-muted-foreground mt-1.5">Exact identifier used on the salesman mobile login page</p>
          </div>

          {!isEditing ? (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="Enter login password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 pr-10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Initial password provisioned by Admin</p>
            </div>
          ) : (
            <div className="p-3.5 bg-surface-inset shadow-inset rounded-xl border border-border/40 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</div>
                <div className="text-xs text-foreground font-medium mt-0.5">Encrypted in database</div>
              </div>
              <span className="text-xs text-muted-foreground">Reset via sidebar panel</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Territory Allocation */}
      <div className="bg-surface-raised shadow-raised rounded-2xl p-6 border border-border/40 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              3. Territory Allocation
            </h2>
          </div>
          <Badge variant="neutral" styleType="outline" size="sm">
            {selectedAreaIds.length} {selectedAreaIds.length === 1 ? 'Area' : 'Areas'} Allocated
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Assigned Route <span className="text-destructive">*</span>
            </label>
            <select
              name="routeId"
              value={formData.routeId}
              onChange={handleChange}
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer"
            >
              <option value="">-- Choose a Route --</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.city?.name ? `(${r.city.name})` : ''} — {r.areas?.length || 0} Areas
                </option>
              ))}
            </select>
          </div>

          {/* Areas under selected Route */}
          {currentRoute && (
            <div className="p-4 border border-border/40 rounded-xl bg-surface-inset/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Map className="w-4 h-4 text-primary" />
                  Areas in {currentRoute.name}
                </div>
                {currentRouteAreas.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllCurrentRouteAreas}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-border">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllCurrentRouteAreas}
                      className="text-xs font-medium text-muted-foreground hover:underline"
                    >
                      Clear Route
                    </button>
                  </div>
                )}
              </div>

              {currentRouteAreas.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground bg-surface-raised rounded-xl border border-dashed border-border/60">
                  No areas created under this route yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {currentRouteAreas.map((area: any) => {
                    const isChecked = selectedAreaIds.includes(area.id);
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => handleToggleArea(area.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl text-left text-xs transition-all border ${
                          isChecked
                            ? 'bg-primary/10 border-primary text-primary font-semibold shadow-inset'
                            : 'bg-surface-raised shadow-raised-sm border-border/40 text-foreground hover:border-primary/40'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">{area.name} ({area._count?.customers || 0})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Active Status Switch / Box */}
      <div className="bg-surface-raised shadow-raised rounded-2xl p-4 border border-border/40 flex items-center gap-3">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
          className="h-4 w-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
        />
        <label htmlFor="isActive" className="text-sm font-semibold text-foreground cursor-pointer">
          Active Salesman Status (Enables Mobile App Login & Territory Operations)
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="shadow-raised hover:shadow-raised-sm press-active"
        >
          <Save className="w-4 h-4 mr-1.5" />
          {isSubmitting ? 'Saving Salesman...' : (isEditing ? 'Save Changes' : 'Create Salesman & Assign Territory')}
        </Button>
      </div>
    </form>
  );
}

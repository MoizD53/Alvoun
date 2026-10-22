'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSalesmanAccount, updateSalesmanAccount } from '@/lib/actions/admin/salesman-management';
import { User, Phone, Lock, Save, Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertBanner } from '@/components/ui/alert-banner';

interface SalesmanFormProps {
  initialData?: any;
  routes?: any[];
}

export default function SalesmanForm({ 
  initialData 
}: SalesmanFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    loginId: initialData?.profile?.email || '',
    password: '',
    isActive: initialData ? initialData.isActive : true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!isEditing && (!formData.password || formData.password.length < 6)) {
        throw new Error('Password must be at least 6 characters.');
      }

      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        loginId: formData.loginId.trim(),
        password: formData.password,
        isActive: formData.isActive,
      };

      let result;
      if (isEditing) {
        result = await updateSalesmanAccount(initialData.id, payload);
      } else {
        result = await createSalesmanAccount(payload);
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      if (isEditing) {
        router.push(`/dashboard/admin/salesmen/${initialData.id}`);
      } else {
        router.push('/dashboard/admin/salesmen');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <AlertBanner variant="danger" onClose={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

      {/* 1. Basic Information */}
      <div className="bg-surface-raised shadow-raised rounded-2xl p-6 border border-border/40 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border/40">
          <User className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            1. Basic Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              required
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Ramesh Patel"
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Contact Phone <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                required
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 pl-10 transition-all"
              />
              <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Login Credentials */}
      <div className="bg-surface-raised shadow-raised rounded-2xl p-6 border border-border/40 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border/40">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            2. App Login Credentials
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Login ID <span className="text-destructive">*</span>
            </label>
            <input
              required
              type="text"
              name="loginId"
              value={formData.loginId}
              onChange={handleChange}
              placeholder="e.g. ramesh@salesman"
              className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <p className="text-xs text-muted-foreground mt-1.5">Salesman uses this ID to log in to the field application</p>
          </div>

          {!isEditing ? (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Initial Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 pr-10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">e.g. ramesh@123</p>
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

      {/* 3. Active Status Switch */}
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
          Active Salesman Status (Enables Mobile App Login & Daily Operations)
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
          {isSubmitting ? 'Saving Salesman...' : (isEditing ? 'Save Changes' : 'Create Salesman')}
        </Button>
      </div>
    </form>
  );
}

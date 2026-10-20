'use client';

import { useState } from 'react';
import { createProduct, updateProduct, deactivateProduct, activateProduct } from '@/lib/actions/admin/product';
import { Plus, CheckCircle2, XCircle, AlertTriangle, Package, Edit, Power, Save } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertBanner } from '@/components/ui/alert-banner';

type Product = {
  id: string;
  name: string;
  bottlesPerCrate: number;
  isActive: boolean;
  rates: { rate: number }[];
};

export default function ProductManager({ initialProducts: products }: { initialProducts: Product[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, isUpdate: boolean, id?: string) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    
    if (isUpdate) {
      formData.set('isActive', (e.currentTarget.elements.namedItem('isActive') as HTMLSelectElement).value);
    }
    
    const res = isUpdate && id 
      ? await updateProduct(id, formData)
      : await createProduct(formData);

    if (res?.error) {
      setError(res.error);
    } else {
      setIsAdding(false);
      setEditingId(null);
    }
    setLoading(false);
  };

  const toggleStatus = async (id: string, currentlyActive: boolean) => {
    if (currentlyActive && !confirm("Deactivate this product? Existing historical sales will remain unchanged, but it will not be available for new sales.")) return;
    
    setLoading(true);
    const res = currentlyActive ? await deactivateProduct(id) : await activateProduct(id);
    if (res?.error) alert(res.error);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="bg-surface-raised shadow-raised p-5 sm:p-6 rounded-2xl border border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-inset shadow-inset border border-border/40 flex items-center justify-center text-primary shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Product Master Catalog</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage bottle pack sizes, crate quantities, and standard unit rates</p>
          </div>
        </div>

        <Button 
          onClick={() => setIsAdding(true)}
          variant="primary"
          className="shadow-raised hover:shadow-raised-sm press-active"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Product
        </Button>
      </div>

      {error && (
        <AlertBanner
          variant="danger"
          onClose={() => setError(null)}
        >
          {error}
        </AlertBanner>
      )}

      {/* Add Form Container */}
      {isAdding && (
        <div className="bg-surface-raised shadow-raised p-6 rounded-2xl border border-border/40 animate-fade-in-up">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border/40">
            <Plus className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Add New Catalog Product</h3>
          </div>

          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Product Name <span className="text-destructive">*</span>
                </label>
                <input 
                  required 
                  name="name" 
                  type="text" 
                  placeholder="e.g. 1 Litre" 
                  className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Bottles per Crate <span className="text-destructive">*</span>
                </label>
                <input 
                  required 
                  name="bottlesPerCrate" 
                  type="number" 
                  min="1" 
                  placeholder="e.g. 12" 
                  className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Current Rate per Crate (₹) <span className="text-destructive">*</span>
                </label>
                <input 
                  required 
                  name="rate" 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  placeholder="e.g. 500.00" 
                  className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" 
                />
              </div>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={loading} className="shadow-raised hover:shadow-raised-sm press-active">
                <Save className="w-4 h-4 mr-1.5" />
                Save Product
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table Card */}
      <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap">
            <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
              <tr>
                <th className="px-5 py-3.5">Product Name</th>
                <th className="px-5 py-3.5">Pack Size</th>
                <th className="px-5 py-3.5">Current Rate</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-surface-raised">
              {products.map(product => {
                const isEditing = editingId === product.id;
                const currentRate = product.rates[0]?.rate || 0;

                if (isEditing) {
                  return (
                    <tr key={product.id} className="bg-surface-inset/30">
                      <td colSpan={5} className="px-5 py-4">
                        <form onSubmit={(e) => handleSubmit(e, true, product.id)} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                          <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Name</label>
                            <input 
                              required 
                              name="name" 
                              defaultValue={product.name} 
                              type="text" 
                              className="w-full rounded-xl bg-surface-raised shadow-raised-sm border border-border/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" 
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bottles/Crate</label>
                            <input 
                              required 
                              name="bottlesPerCrate" 
                              defaultValue={product.bottlesPerCrate} 
                              type="number" 
                              min="1" 
                              className="w-full rounded-xl bg-surface-raised shadow-raised-sm border border-border/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" 
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Rate (₹)</label>
                            <input 
                              required 
                              name="rate" 
                              defaultValue={currentRate / 100} 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              className="w-full rounded-xl bg-surface-raised shadow-raised-sm border border-border/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" 
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Status</label>
                            <select 
                              name="isActive" 
                              defaultValue={product.isActive.toString()} 
                              className="w-full rounded-xl bg-surface-raised shadow-raised-sm border border-border/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                            <Button type="submit" variant="primary" size="sm" isLoading={loading} className="shadow-raised hover:shadow-raised-sm press-active">
                              Save
                            </Button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={product.id} className="hover:bg-surface-inset/30 transition-colors">
                    <td className="px-5 py-4 font-bold text-foreground">{product.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">{product.bottlesPerCrate} bottles / crate</td>
                    <td className="px-5 py-4 font-bold text-foreground">{formatMoney(currentRate)}</td>
                    <td className="px-5 py-4">
                      {product.isActive ? (
                        <Badge variant="success" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="neutral" styleType="outline" size="sm">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <button 
                        onClick={() => setEditingId(product.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline px-2 py-1"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button 
                        onClick={() => toggleStatus(product.id, product.isActive)}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 ${
                          product.isActive 
                            ? 'text-destructive hover:underline' 
                            : 'text-emerald-600 dark:text-emerald-400 hover:underline'
                        }`}
                        disabled={loading}
                      >
                        <Power className="w-3.5 h-3.5" /> {product.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No products configured yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { createProduct, updateProduct, deactivateProduct, activateProduct } from '@/lib/actions/admin/product';
import { Plus, Edit2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { formatMoney } from '@/lib/format';

type Product = {
  id: string;
  name: string;
  bottlesPerCrate: number;
  isActive: boolean;
  rates: { rate: number }[];
};

export default function ProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products] = useState<Product[]>(initialProducts);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, isUpdate: boolean, id?: string) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    
    // The modal forces string isActive for updates
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
      <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Product Master</h2>
          <p className="text-sm text-slate-500">Manage active products, pack sizes, and current rates.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-alvoun-blue text-white rounded-md text-sm font-medium hover:bg-alvoun-dark flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Add Form */}
      {isAdding && (
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in-up">
          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Product Name</label>
                <input required name="name" type="text" placeholder="e.g. 1 Litre" className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bottles per Crate</label>
                <input required name="bottlesPerCrate" type="number" min="1" placeholder="e.g. 12" className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Rate per Crate (₹)</label>
                <input required name="rate" type="number" step="0.01" min="0.01" placeholder="e.g. 500" className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-700">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-alvoun-blue text-white rounded-md text-sm font-medium hover:bg-alvoun-dark disabled:opacity-50">Save Product</button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">Pack Size</th>
                <th className="px-6 py-3">Current Rate</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map(product => {
                const isEditing = editingId === product.id;
                const currentRate = product.rates[0]?.rate || 0;

                if (isEditing) {
                  return (
                    <tr key={product.id} className="bg-slate-50 dark:bg-slate-900/50">
                      <td colSpan={5} className="px-6 py-4">
                        <form onSubmit={(e) => handleSubmit(e, true, product.id)} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                            <input required name="name" defaultValue={product.name} type="text" className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Bottles/Crate</label>
                            <input required name="bottlesPerCrate" defaultValue={product.bottlesPerCrate} type="number" min="1" className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Rate (₹)</label>
                            <input required name="rate" defaultValue={currentRate / 100} type="number" step="0.01" min="0" className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                            <select name="isActive" defaultValue={product.isActive.toString()} className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100">
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                          <div className="flex gap-2 justify-end h-[38px]">
                            <button type="button" onClick={() => setEditingId(null)} className="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-sm font-medium">Cancel</button>
                            <button type="submit" disabled={loading} className="px-3 py-2 bg-alvoun-blue text-white rounded-md text-sm font-medium">Save</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{product.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{product.bottlesPerCrate} bottles/crate</td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{formatMoney(currentRate)}</td>
                    <td className="px-6 py-4">
                      {product.isActive ? (
                        <span className="inline-flex items-center gap-1 text-alvoun-green text-xs font-medium">
                          <CheckCircle2 className="h-4 w-4" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium">
                          <XCircle className="h-4 w-4" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button 
                        onClick={() => setEditingId(product.id)}
                        className="text-alvoun-blue hover:text-alvoun-dark font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => toggleStatus(product.id, product.isActive)}
                        className={`${product.isActive ? 'text-red-500 hover:text-red-600' : 'text-green-600 hover:text-green-700'} font-medium text-sm`}
                        disabled={loading}
                      >
                        {product.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No products configured.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateRoute, deactivateRoute, activateRoute, deleteRoute } from '@/lib/actions/route';
import { MapPin, MoreVertical, Edit2, Trash2, PowerOff, Power } from 'lucide-react';

export default function RouteListClient({ routes, cities, salesmen }: { routes: any[], cities: any[], salesmen: any[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', cityId: '', salesmanId: '', isActive: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const startEdit = (route: any) => {
    setEditingId(route.id);
    setEditForm({
      name: route.name,
      cityId: route.cityId,
      salesmanId: route.salesmanId || '',
      isActive: route.isActive
    });
    setMenuOpen(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError('');
  };

  const handleSave = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('name', editForm.name);
    formData.append('cityId', editForm.cityId);
    if (editForm.salesmanId) formData.append('salesmanId', editForm.salesmanId);
    formData.append('isActive', editForm.isActive.toString());

    const result = await updateRoute(id, formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setEditingId(null);
    }
    setLoading(false);
  };

  const handleDeactivate = async (id: string, name: string) => {
    setMenuOpen(null);
    if (!confirm(`Deactivate ${name}?\n\nExisting customers and historical records will remain unchanged. It will just be hidden from assignments.`)) return;
    
    await deactivateRoute(id);
  };

  const handleActivate = async (id: string, name: string) => {
    setMenuOpen(null);
    await activateRoute(id);
  };

  const handleDelete = async (id: string, name: string) => {
    setMenuOpen(null);
    if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    
    const res = await deleteRoute(id);
    if (res?.error) {
      alert(res.error);
    }
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpen(menuOpen === id ? null : id);
  };

  return (
    <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle overflow-hidden">
      <div className="overflow-x-auto min-h-[260px] pb-12">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface/80 text-text-muted font-bold text-xs uppercase tracking-wider border-b border-border-subtle">
            <tr>
              <th className="px-6 py-4">Route Name</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Assigned Salesman</th>
              <th className="px-6 py-4 text-center">Customers</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {routes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-text-muted">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-14 h-14 bg-surface-sunken shadow-inset border border-border-subtle rounded-2xl flex items-center justify-center mb-3 text-text-muted">
                      <MapPin className="h-7 w-7" />
                    </div>
                    <p className="text-base font-black text-text-primary">No routes found</p>
                    <p className="text-xs font-semibold text-text-muted mt-1">Create your first route using the form on the right.</p>
                  </div>
                </td>
              </tr>
            ) : (
              routes.map((route, index) => {
                const isEditing = editingId === route.id;
                const isNearBottom = index >= Math.max(1, routes.length - 2);

                if (isEditing) {
                  return (
                    <tr key={route.id} className="bg-surface-sunken/60">
                      <td colSpan={6} className="px-6 py-4">
                        <form onSubmit={(e) => handleSave(e, route.id)} className="flex items-start gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap gap-4">
                              <div className="flex-1 min-w-[180px]">
                                <label className="block mb-1 text-xs font-bold text-text-muted uppercase tracking-wider">Route Name</label>
                                <input 
                                  autoFocus
                                  type="text" 
                                  value={editForm.name}
                                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                                  className="w-full border border-border-subtle rounded-xl px-3 py-2 text-sm bg-surface-raised text-text-primary font-semibold shadow-inset-sm focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                                  required
                                />
                              </div>
                              <div className="flex-1 min-w-[160px]">
                                <label className="block mb-1 text-xs font-bold text-text-muted uppercase tracking-wider">City</label>
                                <select 
                                  value={editForm.cityId}
                                  onChange={e => setEditForm({...editForm, cityId: e.target.value})}
                                  className="w-full border border-border-subtle rounded-xl px-3 py-2 text-sm bg-surface-raised text-text-primary font-semibold shadow-inset-sm focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                                  required
                                >
                                  {cities.map(city => (
                                    <option key={city.id} value={city.id}>{city.name} ({city.state.name})</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex-1 min-w-[160px]">
                                <label className="block mb-1 text-xs font-bold text-text-muted uppercase tracking-wider">Salesman</label>
                                <select 
                                  value={editForm.salesmanId}
                                  onChange={e => setEditForm({...editForm, salesmanId: e.target.value})}
                                  className="w-full border border-border-subtle rounded-xl px-3 py-2 text-sm bg-surface-raised text-text-primary font-semibold shadow-inset-sm focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                                >
                                  <option value="">Unassigned</option>
                                  {salesmen.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="w-28">
                                <label className="block mb-1 text-xs font-bold text-text-muted uppercase tracking-wider">Status</label>
                                <div className="flex items-center h-[38px]">
                                  <input 
                                    type="checkbox"
                                    checked={editForm.isActive}
                                    onChange={e => setEditForm({...editForm, isActive: e.target.checked})}
                                    className="w-4 h-4 rounded border-border-subtle text-brand-teal focus:ring-brand-teal"
                                  />
                                  <span className="ml-2 text-xs font-bold text-text-primary">Active</span>
                                </div>
                              </div>
                            </div>
                            {error && <p className="text-xs text-accent-terracotta font-bold">{error}</p>}
                          </div>
                          <div className="flex items-end gap-2 pt-5">
                            <button 
                              type="button" 
                              onClick={cancelEdit} 
                              className="px-3.5 py-2 border border-border-subtle rounded-xl text-xs font-bold text-text-secondary bg-surface-raised shadow-raised-sm active:scale-95 transition-all"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit" 
                              disabled={loading} 
                              className="px-4 py-2 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-xl text-xs font-bold shadow-raised disabled:opacity-50 active:scale-95 transition-all"
                            >
                              {loading ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={route.id} className="hover:bg-surface-sunken/40 transition-colors group">
                    <td className="px-6 py-4 font-black text-text-primary text-base">{route.name}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-text-secondary">{route.city.name}</span>
                      <span className="text-text-muted text-xs ml-1 font-medium">({route.city.state.name})</span>
                    </td>
                    <td className="px-6 py-4">
                      {route.salesman ? (
                        <div className="font-bold text-text-primary">{route.salesman.name}</div>
                      ) : (
                        <span className="text-text-muted italic text-xs font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center h-6 min-w-[1.75rem] px-2.5 rounded-full bg-surface-sunken shadow-inset-sm text-xs font-black text-text-primary border border-border-subtle">
                        {route._count.customers}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {route.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-raised-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-surface-sunken text-text-muted border border-border-subtle shadow-inset-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Primary Action: Manage */}
                        <Link 
                          href={`/dashboard/admin/routes/${route.id}`} 
                          className="px-3.5 py-1.5 bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal border border-brand-teal/20 rounded-xl text-xs font-bold shadow-raised-sm active:scale-95 transition-all inline-flex items-center gap-1"
                        >
                          Manage
                        </Link>
                        
                        {/* Overflow Menu: [ ⋮ ] */}
                        <div className="relative inline-block text-left">
                          <button 
                            type="button"
                            onClick={(e) => toggleMenu(e, route.id)}
                            className={`p-1.5 rounded-xl transition-all border ${
                              menuOpen === route.id
                                ? 'bg-surface-sunken text-text-primary border-border-subtle shadow-inset'
                                : 'text-text-muted hover:text-text-primary bg-surface-raised shadow-raised-sm hover:shadow-raised border-border-subtle'
                            }`}
                            title="More options"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {menuOpen === route.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-20" 
                                onClick={() => setMenuOpen(null)} 
                              />
                              <div 
                                className={`absolute right-0 ${
                                  isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                } z-30 w-44 bg-surface-raised border border-border-subtle rounded-2xl shadow-raised-lg py-1 flex flex-col text-xs font-semibold text-left`}
                              >
                                <button
                                  type="button"
                                  onClick={() => { startEdit(route); setMenuOpen(null); }}
                                  className="flex items-center gap-2 px-3.5 py-2.5 text-text-secondary hover:text-text-primary hover:bg-surface-sunken/60 text-left w-full transition-colors"
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-text-muted" /> Edit Route
                                </button>
                                
                                {route.isActive ? (
                                  <button 
                                    type="button"
                                    onClick={() => handleDeactivate(route.id, route.name)} 
                                    className="flex items-center gap-2 px-3.5 py-2.5 text-amber-600 hover:bg-amber-500/10 text-left w-full transition-colors"
                                  >
                                    <PowerOff className="h-3.5 w-3.5 text-amber-500" /> Deactivate Route
                                  </button>
                                ) : (
                                  <button 
                                    type="button"
                                    onClick={() => handleActivate(route.id, route.name)} 
                                    className="flex items-center gap-2 px-3.5 py-2.5 text-emerald-600 hover:bg-emerald-500/10 text-left w-full transition-colors"
                                  >
                                    <Power className="h-3.5 w-3.5 text-emerald-500" /> Activate Route
                                  </button>
                                )}

                                {route._count.customers === 0 && (
                                  <>
                                    <div className="my-1 border-t border-border-subtle" />
                                    <button 
                                      type="button"
                                      onClick={() => handleDelete(route.id, route.name)} 
                                      className="flex items-center gap-2 px-3.5 py-2.5 text-accent-terracotta hover:bg-red-500/10 text-left w-full transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-accent-terracotta" /> Delete Route
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

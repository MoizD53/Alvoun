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
    <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="overflow-x-auto min-h-[260px] pb-12">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-3">Route Name</th>
              <th className="px-6 py-3">Location</th>
              <th className="px-6 py-3">Assigned Salesman</th>
              <th className="px-6 py-3 text-center">Customers</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {routes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <MapPin className="h-8 w-8 mb-3 text-slate-300" />
                    <p className="text-base font-medium text-slate-600 dark:text-slate-400">No routes found</p>
                    <p className="text-sm mt-1 text-slate-400">Create your first route using the form.</p>
                  </div>
                </td>
              </tr>
            ) : (
              routes.map((route, index) => {
                const isEditing = editingId === route.id;
                const isNearBottom = index >= Math.max(1, routes.length - 2);

                if (isEditing) {
                  return (
                    <tr key={route.id} className="bg-slate-50 dark:bg-slate-900/50">
                      <td colSpan={6} className="px-6 py-4">
                        <form onSubmit={(e) => handleSave(e, route.id)} className="flex items-start gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex gap-4">
                              <div className="flex-1">
                                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">Route Name</label>
                                <input 
                                  autoFocus
                                  type="text" 
                                  value={editForm.name}
                                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                                  className="w-full border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                  required
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">City</label>
                                <select 
                                  value={editForm.cityId}
                                  onChange={e => setEditForm({...editForm, cityId: e.target.value})}
                                  className="w-full border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                  required
                                >
                                  {cities.map(city => (
                                    <option key={city.id} value={city.id}>{city.name} ({city.state.name})</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex-1">
                                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">Salesman</label>
                                <select 
                                  value={editForm.salesmanId}
                                  onChange={e => setEditForm({...editForm, salesmanId: e.target.value})}
                                  className="w-full border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                >
                                  <option value="">Unassigned</option>
                                  {salesmen.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="w-24">
                                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">Status</label>
                                <div className="flex items-center h-[34px]">
                                  <input 
                                    type="checkbox"
                                    checked={editForm.isActive}
                                    onChange={e => setEditForm({...editForm, isActive: e.target.checked})}
                                    className="rounded border-slate-300 text-alvoun-blue focus:ring-alvoun-blue"
                                  />
                                  <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Active</span>
                                </div>
                              </div>
                            </div>
                            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                          </div>
                          <div className="flex items-end gap-2 pt-5">
                            <button type="button" onClick={cancelEdit} className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                              Cancel
                            </button>
                            <button type="submit" disabled={loading} className="px-3 py-1.5 bg-alvoun-blue text-white rounded-md text-sm font-medium hover:bg-alvoun-dark disabled:opacity-50">
                              {loading ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={route.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group">
                    <td className="px-6 py-3 font-bold text-slate-900 dark:text-slate-100">{route.name}</td>
                    <td className="px-6 py-3">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{route.city.name}</span>
                      <span className="text-slate-400 text-xs ml-1">({route.city.state.name})</span>
                    </td>
                    <td className="px-6 py-3">
                      {route.salesman ? (
                        <div className="font-medium text-slate-900 dark:text-slate-100">{route.salesman.name}</div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                        {route._count.customers}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {route.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/20 text-alvoun-green">
                          <span className="h-1.5 w-1.5 rounded-full bg-alvoun-green"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Primary Action: Manage */}
                        <Link 
                          href={`/dashboard/admin/routes/${route.id}`} 
                          className="px-3 py-1.5 bg-alvoun-blue/10 text-alvoun-blue hover:bg-alvoun-blue/20 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                        >
                          Manage
                        </Link>
                        
                        {/* Overflow Menu: [ ⋮ ] */}
                        <div className="relative inline-block text-left">
                          <button 
                            type="button"
                            onClick={(e) => toggleMenu(e, route.id)}
                            className={`p-1.5 rounded-lg transition-colors border ${
                              menuOpen === route.id
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700'
                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent'
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
                                } z-30 w-44 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 flex flex-col text-xs font-medium text-left`}
                              >
                                <button
                                  type="button"
                                  onClick={() => { startEdit(route); setMenuOpen(null); }}
                                  className="flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 text-left w-full transition-colors"
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-slate-400" /> Edit Route
                                </button>
                                
                                {route.isActive ? (
                                  <button 
                                    type="button"
                                    onClick={() => handleDeactivate(route.id, route.name)} 
                                    className="flex items-center gap-2 px-3.5 py-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-left w-full transition-colors"
                                  >
                                    <PowerOff className="h-3.5 w-3.5 text-amber-500" /> Deactivate Route
                                  </button>
                                ) : (
                                  <button 
                                    type="button"
                                    onClick={() => handleActivate(route.id, route.name)} 
                                    className="flex items-center gap-2 px-3.5 py-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-left w-full transition-colors"
                                  >
                                    <Power className="h-3.5 w-3.5 text-emerald-500" /> Activate Route
                                  </button>
                                )}

                                {route._count.customers === 0 && (
                                  <>
                                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                    <button 
                                      type="button"
                                      onClick={() => handleDelete(route.id, route.name)} 
                                      className="flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-left w-full transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-red-500" /> Delete Route
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

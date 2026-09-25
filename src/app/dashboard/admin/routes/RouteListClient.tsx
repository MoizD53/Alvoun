'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateRoute, deactivateRoute, deleteRoute } from '@/lib/actions/route';
import { MapPin, MoreVertical, Edit2, Trash2, PowerOff, ShieldAlert } from 'lucide-react';

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

  const handleDelete = async (id: string, name: string) => {
    setMenuOpen(null);
    if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    
    const res = await deleteRoute(id);
    if (res?.error) {
      alert(res.error);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-visible">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full text-sm text-left whitespace-nowrap min-h-[200px]">
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
              routes.map((route) => {
                const isEditing = editingId === route.id;

                if (isEditing) {
                  return (
                    <tr key={route.id} className="bg-slate-50 dark:bg-slate-900/50">
                      <td colSpan={6} className="px-6 py-4">
                        <form onSubmit={(e) => handleSave(e, route.id)} className="flex items-start gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex gap-4">
                              <div className="flex-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Route Name</label>
                                <input 
                                  autoFocus
                                  type="text" 
                                  value={editForm.name}
                                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                                  className="w-full mt-1 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                  required
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">City</label>
                                <select 
                                  value={editForm.cityId}
                                  onChange={e => setEditForm({...editForm, cityId: e.target.value})}
                                  className="w-full mt-1 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                  required
                                >
                                  {cities.map(city => (
                                    <option key={city.id} value={city.id}>{city.name} ({city.state.name})</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Salesman</label>
                                <select 
                                  value={editForm.salesmanId}
                                  onChange={e => setEditForm({...editForm, salesmanId: e.target.value})}
                                  className="w-full mt-1 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                >
                                  <option value="">Unassigned</option>
                                  {salesmen.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="w-24">
                                <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                                <div className="mt-2 flex items-center">
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
                      <div className="flex items-center justify-end gap-2 relative">
                        <Link 
                          href={`/dashboard/admin/routes/${route.id}`} 
                          className="px-3 py-1.5 bg-alvoun-blue/10 text-alvoun-blue hover:bg-alvoun-blue/20 rounded-lg text-sm font-bold transition-colors"
                        >
                          Manage
                        </Link>
                        
                        <button onClick={() => startEdit(route)} className="p-1.5 text-slate-400 hover:text-alvoun-blue rounded-md transition-colors" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        
                        <div className="relative">
                          <button 
                            onClick={() => setMenuOpen(menuOpen === route.id ? null : route.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          
                          {menuOpen === route.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)}></div>
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-20 py-1 flex flex-col">
                                {route.isActive && (
                                  <button onClick={() => handleDeactivate(route.id, route.name)} className="flex items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-left w-full transition-colors">
                                    <PowerOff className="h-4 w-4" /> Deactivate
                                  </button>
                                )}
                                <button onClick={() => handleDelete(route.id, route.name)} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-left w-full transition-colors">
                                  {route._count.customers > 0 ? <ShieldAlert className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />} Delete Route
                                </button>
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

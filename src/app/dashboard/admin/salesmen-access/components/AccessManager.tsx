'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignTerritory, deleteAssignment, getSalesmanAssignments } from '@/lib/actions/admin/salesman-access';
import { X, Navigation, Plus, Trash2, MapPin, Users, AlertCircle } from 'lucide-react';

export default function AccessManager({ initialSalesmen, routes }: { initialSalesmen: any[], routes: any[] }) {
  const router = useRouter();
  const [salesmen, setSalesmen] = useState(initialSalesmen || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState<any>(null);
  
  // State for the modal
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [stagedAssignments, setStagedAssignments] = useState<{routeId: string, areaId: string}[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);

  const openEditModal = async (salesman: any) => {
    setEditingSalesman(salesman);
    setStagedAssignments([]);
    setIsModalOpen(true);

    // Fetch their current detailed assignments
    const currentAssignments = await getSalesmanAssignments(salesman.id);
    setStagedAssignments(currentAssignments.map((a: any) => ({
      routeId: a.routeId,
      areaId: a.areaId
    })));
  };

  const handleDelete = async (salesmanId: string) => {
    if (!confirm('Are you sure you want to remove all access for this salesman?')) return;
    
    await deleteAssignment(salesmanId);
    setSalesmen(salesmen.map(s => s.id === salesmanId ? { ...s, routes: [], areas: [], totalCustomers: 0 } : s));
  };

  const handleAddArea = () => {
    if (!selectedRouteId) return;
    
    // Add all selected areas
    const newAssignments = [...stagedAssignments];
    
    for (const areaId of selectedAreas) {
      if (!newAssignments.some(a => a.areaId === areaId)) {
        newAssignments.push({ routeId: selectedRouteId, areaId });
      }
    }
    
    setStagedAssignments(newAssignments);
    setSelectedAreas([]); // reset area selection
  };

  const handleRemoveAssignment = (areaId: string) => {
    setStagedAssignments(stagedAssignments.filter(a => a.areaId !== areaId));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await assignTerritory(editingSalesman.id, stagedAssignments);
    
    // Optimistic update
    const updatedRoutes = Array.from(new Set(stagedAssignments.map(a => routes.find(r => r.id === a.routeId)?.name || '')));
    const updatedAreas = Array.from(new Set(stagedAssignments.map(a => {
      const route = routes.find(r => r.id === a.routeId);
      const area = route?.areas?.find((ar: any) => ar.id === a.areaId);
      return area?.name || '';
    })));

    setSalesmen(salesmen.map(s => s.id === editingSalesman.id ? { 
      ...s, 
      routes: updatedRoutes, 
      areas: updatedAreas 
    } : s));
    
    setIsModalOpen(false);
    setIsSaving(false);
    router.refresh();
  };

  return (
    <div className="bg-surface-raised rounded-3xl border border-border-default shadow-raised overflow-hidden">
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-inset text-primary font-extrabold text-xs uppercase tracking-wider border-b border-border-default">
            <tr>
              <th className="px-6 py-4 text-primary font-black">Salesman</th>
              <th className="px-6 py-4 text-primary font-black">Assigned Routes</th>
              <th className="px-6 py-4 text-primary font-black">Assigned Areas</th>
              <th className="px-6 py-4 text-center text-primary font-black">Total Customers</th>
              <th className="px-6 py-4 text-right text-primary font-black">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {salesmen.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-secondary">
                    <div className="w-14 h-14 bg-surface-inset shadow-inset border border-border-default rounded-2xl flex items-center justify-center mb-3 text-secondary">
                      <Users className="h-7 w-7" />
                    </div>
                    <p className="text-base font-black text-primary">No salesmen found</p>
                    <p className="text-xs font-semibold text-secondary mt-1">Add salesmen accounts to assign territory coverage.</p>
                  </div>
                </td>
              </tr>
            ) : (
              salesmen.map((salesman) => (
                <tr key={salesman.id} className="hover:bg-surface-inset/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-black text-primary text-base">{salesman.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    {salesman.routes && salesman.routes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {salesman.routes.map((r: string) => (
                          <span key={r} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-teal-800/10 text-teal-800 dark:text-teal-300 border border-teal-800/20 shadow-raised-sm">
                            {r}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-secondary italic text-xs font-medium">None assigned</span>}
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate text-xs font-bold text-secondary">
                    {salesman.areas && salesman.areas.length > 0 ? (
                      salesman.areas.join(', ')
                    ) : <span className="text-secondary italic font-medium">None</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black bg-surface-inset shadow-inset-sm text-primary border border-border-default min-w-[2rem]">
                      {salesman.totalCustomers ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => openEditModal(salesman)}
                      className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-raised active:scale-95 transition-all cursor-pointer"
                    >
                      Edit Territory
                    </button>
                    <button 
                      onClick={() => handleDelete(salesman.id)}
                      className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-danger border border-red-500/20 rounded-xl text-xs font-bold shadow-raised-sm active:scale-95 transition-all cursor-pointer"
                    >
                      Clear Access
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-raised rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-modal border border-border-default animate-scale-up">
            <div className="p-6 border-b border-border-default flex justify-between items-center bg-surface-inset">
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-teal-800 dark:text-teal-400" />
                <h2 className="text-lg font-black text-primary">
                  Assign Territory to <span className="text-teal-800 dark:text-teal-400">{editingSalesman?.name}</span>
                </h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-raised text-secondary hover:text-primary shadow-raised-sm active:shadow-inset transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1.5">Select Route</label>
                  <select 
                    value={selectedRouteId} 
                    onChange={e => {
                      setSelectedRouteId(e.target.value);
                      setSelectedAreas([]);
                    }}
                    className="w-full border border-border-default rounded-2xl p-3 bg-surface-inset shadow-inset text-sm font-semibold text-primary focus:border-teal-700 outline-none"
                  >
                    <option value="">-- Select Route --</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1.5">Select Area(s)</label>
                  <select 
                    multiple
                    value={selectedAreas} 
                    onChange={e => {
                      const options = Array.from(e.target.selectedOptions, option => option.value);
                      setSelectedAreas(options);
                    }}
                    disabled={!selectedRouteId}
                    className="w-full border border-border-default rounded-2xl p-2.5 bg-surface-inset shadow-inset text-sm font-semibold text-primary h-28 focus:border-teal-700 outline-none disabled:opacity-50"
                  >
                    {routes.find(r => r.id === selectedRouteId)?.areas?.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-secondary font-medium mt-1">Hold Ctrl/Cmd to select multiple areas</p>
                </div>
              </div>

              <button 
                onClick={handleAddArea}
                disabled={!selectedRouteId || selectedAreas.length === 0}
                className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-raised disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add Selected Areas
              </button>

              <div className="mt-8">
                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Staged Assignments</h3>
                {stagedAssignments.length === 0 ? (
                  <div className="p-4 bg-surface-inset shadow-inset rounded-2xl border border-border-default text-center text-xs font-medium text-secondary">
                    No areas assigned yet. Select a route and areas above to stage them.
                  </div>
                ) : (
                  <div className="bg-surface-inset shadow-inset rounded-2xl border border-border-default divide-y divide-border-subtle overflow-hidden">
                    {stagedAssignments.map((a, idx) => {
                      const route = routes.find(r => r.id === a.routeId);
                      const area = route?.areas?.find((ar: any) => ar.id === a.areaId);
                      return (
                        <div key={idx} className="p-3.5 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-teal-800 dark:text-teal-400" />
                            <span className="font-bold text-primary">{route?.name}</span>
                            <span className="text-secondary">/</span>
                            <span className="font-medium text-secondary">{area?.name}</span>
                          </div>
                          <button 
                            onClick={() => handleRemoveAssignment(a.areaId)}
                            className="text-danger hover:underline font-bold text-xs cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-border-default bg-surface-inset flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 border border-border-default rounded-2xl text-xs font-bold text-secondary bg-surface-raised shadow-raised-sm active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-2xl text-xs font-black shadow-raised disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Assignments'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

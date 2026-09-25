'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignTerritory, deleteAssignment, getSalesmanAssignments } from '@/lib/actions/admin/salesman-access';

export default function AccessManager({ initialSalesmen, routes }: { initialSalesmen: any[], routes: any[] }) {
  const router = useRouter();
  const [salesmen, setSalesmen] = useState(initialSalesmen);
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
      const area = route?.areas.find((ar: any) => ar.id === a.areaId);
      return area?.name || '';
    })));

    setSalesmen(salesmen.map(s => s.id === editingSalesman.id ? { 
      ...s, 
      routes: updatedRoutes, 
      areas: updatedAreas 
    } : s));
    
    setIsModalOpen(false);
    setIsSaving(false);
    // Refresh page to get accurate totalCustomers count
    router.refresh();
  };

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Salesman</th>
              <th className="px-6 py-4 font-medium">Assigned Routes</th>
              <th className="px-6 py-4 font-medium">Assigned Areas</th>
              <th className="px-6 py-4 font-medium">Total Customers</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {salesmen.map((salesman) => (
              <tr key={salesman.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{salesman.name}</div>
                </td>
                <td className="px-6 py-4">
                  {salesman.routes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {salesman.routes.map((r: string) => (
                        <span key={r} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : <span className="text-slate-400">None</span>}
                </td>
                <td className="px-6 py-4 max-w-xs truncate">
                  {salesman.areas.length > 0 ? (
                    salesman.areas.join(', ')
                  ) : <span className="text-slate-400">None</span>}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 min-w-8">
                    {salesman.totalCustomers}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  <button 
                    onClick={() => openEditModal(salesman)}
                    className="text-alvoun-blue hover:text-alvoun-dark font-medium"
                  >
                    Edit Assignment
                  </button>
                  <button 
                    onClick={() => handleDelete(salesman.id)}
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    Delete Assignment
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold">Assign Territory to {editingSalesman?.name}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Select Route</label>
                  <select 
                    value={selectedRouteId} 
                    onChange={e => {
                      setSelectedRouteId(e.target.value);
                      setSelectedAreas([]);
                    }}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-md p-2 bg-white dark:bg-slate-900"
                  >
                    <option value="">-- Select Route --</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Select Area(s)</label>
                  <select 
                    multiple
                    value={selectedAreas} 
                    onChange={e => {
                      const options = Array.from(e.target.selectedOptions, option => option.value);
                      setSelectedAreas(options);
                    }}
                    disabled={!selectedRouteId}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-md p-2 bg-white dark:bg-slate-900 h-24"
                  >
                    {routes.find(r => r.id === selectedRouteId)?.areas.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                </div>
              </div>

              <button 
                onClick={handleAddArea}
                disabled={!selectedRouteId || selectedAreas.length === 0}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                Add Selected Areas
              </button>

              <div className="mt-8">
                <h3 className="font-semibold mb-3">Staged Assignments</h3>
                {stagedAssignments.length === 0 ? (
                  <p className="text-sm text-slate-500">No areas assigned yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-md">
                    {stagedAssignments.map((a, idx) => {
                      const route = routes.find(r => r.id === a.routeId);
                      const area = route?.areas.find((ar: any) => ar.id === a.areaId);
                      return (
                        <li key={idx} className="p-3 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                          <div>
                            <span className="font-medium">{route?.name}</span>
                            <span className="mx-2 text-slate-400">/</span>
                            <span className="text-slate-600 dark:text-slate-300">{area?.name}</span>
                          </div>
                          <button 
                            onClick={() => handleRemoveAssignment(a.areaId)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-alvoun-blue text-white rounded-md hover:bg-alvoun-dark disabled:opacity-50"
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

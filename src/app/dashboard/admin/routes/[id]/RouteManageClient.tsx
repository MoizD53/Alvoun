'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createArea, updateArea, assignSalesmanToArea } from '@/lib/actions/area';
import { createCustomer, moveCustomer, deactivateCustomer } from '@/lib/actions/customer';
import { Plus, Edit2, Check, X, MoveRight, ShieldAlert, MoreVertical, Search, User, MapPin, Map } from 'lucide-react';
import { formatMoney } from '@/lib/format';

export default function RouteManageClient({ route, salesmen }: { route: any, salesmen: any[] }) {
  const [activeTab, setActiveTab] = useState<'AREAS' | 'CUSTOMERS'>('AREAS');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Add Area State
  const [showAddArea, setShowAddArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [isSavingArea, setIsSavingArea] = useState(false);

  // Edit Area State
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editAreaName, setEditAreaName] = useState('');

  // Assign Area State
  const [assigningAreaId, setAssigningAreaId] = useState<string | null>(null);
  const [assignmentSalesmanId, setAssignmentSalesmanId] = useState('');

  // Add Customer State
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    customerName: '', contact: '', address: '', areaId: '', openingBalance: 0, openingBalanceType: 'DEBIT', status: 'ACTIVE'
  });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Move Customer State
  const [movingCustomerId, setMovingCustomerId] = useState<string | null>(null);
  const [moveToAreaId, setMoveToAreaId] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  // General error/success state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const showMsg = (type: 'error' | 'success', msg: string) => {
    if (type === 'error') { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); }
  };

  // ----- Area Actions -----
  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingArea(true);
    const fd = new FormData();
    fd.append('name', newAreaName);
    fd.append('routeId', route.id);
    
    const res = await createArea(fd);
    if (res?.error) showMsg('error', res.error);
    else {
      showMsg('success', 'Area created successfully.');
      setShowAddArea(false);
      setNewAreaName('');
    }
    setIsSavingArea(false);
  };

  const startEditArea = (area: any) => {
    setEditingAreaId(area.id);
    setEditAreaName(area.name);
  };

  const handleEditArea = async (areaId: string) => {
    if (!editAreaName.trim()) return;
    const fd = new FormData();
    fd.append('name', editAreaName);
    fd.append('routeId', route.id);
    
    const res = await updateArea(areaId, fd);
    if (res?.error) showMsg('error', res.error);
    else {
      showMsg('success', 'Area updated.');
      setEditingAreaId(null);
    }
  };

  const handleAssignArea = async (areaId: string) => {
    if (!assignmentSalesmanId) return;
    const res = await assignSalesmanToArea(areaId, route.id, assignmentSalesmanId);
    if (res?.error) showMsg('error', res.error);
    else {
      showMsg('success', 'Salesman assigned successfully.');
      setAssigningAreaId(null);
    }
  };

  // ----- Customer Actions -----
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCustomer(true);

    const targetSalesman = customerForm.areaId 
      ? route.areas.find((a: any) => a.id === customerForm.areaId)?.assignments[0]?.salesmanId 
      : route.salesmanId;

    const data = {
      ...customerForm,
      stateId: route.city.stateId,
      cityId: route.cityId,
      routeId: route.id,
      salesmanId: targetSalesman || undefined
    };

    const res = await createCustomer(data);
    if (res?.error) showMsg('error', res.error);
    else {
      showMsg('success', 'Customer created.');
      setShowAddCustomer(false);
      setCustomerForm({ customerName: '', contact: '', address: '', areaId: '', openingBalance: 0, openingBalanceType: 'DEBIT', status: 'ACTIVE' });
    }
    setIsSavingCustomer(false);
  };

  const handleMoveCustomer = async (customer: any) => {
    setIsMoving(true);
    const targetSalesman = moveToAreaId 
      ? route.areas.find((a: any) => a.id === moveToAreaId)?.assignments[0]?.salesmanId 
      : route.salesmanId;

    const res = await moveCustomer(
      customer.id,
      moveToAreaId || null,
      route.id,
      route.cityId,
      route.city.stateId,
      targetSalesman || null
    );

    if (res?.error) showMsg('error', res.error);
    else {
      showMsg('success', 'Customer moved successfully.');
      setMovingCustomerId(null);
    }
    setIsMoving(false);
  };

  const handleDeactivateCustomer = async (customer: any) => {
    if (!confirm(`Deactivate customer ${customer.customerName}?`)) return;
    const res = await deactivateCustomer(customer.id, route.id);
    if (res?.error) showMsg('error', res.error);
    else showMsg('success', 'Customer deactivated.');
  };

  // Filter customers
  const filteredCustomers = route.customers.filter((c: any) => {
    const q = searchTerm.toLowerCase();
    return (
      c.customerName.toLowerCase().includes(q) ||
      c.contact.toLowerCase().includes(q) ||
      (c.area?.name && c.area.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Messages */}
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm font-medium border border-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm font-medium border border-green-200">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab('AREAS')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'AREAS' ? 'border-alvoun-blue text-alvoun-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          AREAS ({route.areas.length})
        </button>
        <button 
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'CUSTOMERS' ? 'border-alvoun-blue text-alvoun-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          CUSTOMERS ({route.customers.length})
        </button>
      </div>

      {/* AREAS TAB */}
      {activeTab === 'AREAS' && (
        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Map className="h-4 w-4" /> Areas in {route.name}</h2>
            <button 
              onClick={() => setShowAddArea(!showAddArea)}
              className="px-3 py-1.5 bg-alvoun-blue text-white rounded-lg text-sm font-bold hover:bg-alvoun-dark flex items-center gap-1 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Area
            </button>
          </div>

          {showAddArea && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <form onSubmit={handleAddArea} className="flex items-end gap-3 max-w-md">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Area Name</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={newAreaName}
                    onChange={e => setNewAreaName(e.target.value)}
                    placeholder="e.g. Station Road"
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-alvoun-blue/20 bg-white dark:bg-slate-950"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSavingArea}
                  className="px-4 py-2 bg-alvoun-green text-white rounded-lg text-sm font-bold hover:bg-green-600 disabled:opacity-50"
                >
                  {isSavingArea ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddArea(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Area Name</th>
                  <th className="px-6 py-3 text-center">Customers</th>
                  <th className="px-6 py-3">Assigned Salesman</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {route.areas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No areas yet. Click Add Area to create one.
                    </td>
                  </tr>
                ) : (
                  route.areas.map((area: any) => (
                    <tr key={area.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-6 py-3 font-bold text-slate-900 dark:text-slate-100">
                        {editingAreaId === area.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              autoFocus
                              type="text" 
                              value={editAreaName}
                              onChange={e => setEditAreaName(e.target.value)}
                              className="px-2 py-1 border border-alvoun-blue rounded-md w-48 text-sm"
                            />
                            <button onClick={() => handleEditArea(area.id)} className="text-alvoun-green"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setEditingAreaId(null)} className="text-red-500"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          area.name
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                          {area._count.customers}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {assigningAreaId === area.id ? (
                          <div className="flex items-center gap-2">
                            <select 
                              value={assignmentSalesmanId}
                              onChange={e => setAssignmentSalesmanId(e.target.value)}
                              className="px-2 py-1 border border-alvoun-blue rounded-md w-40 text-sm"
                            >
                              <option value="">Select...</option>
                              {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button onClick={() => handleAssignArea(area.id)} className="text-alvoun-green"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setAssigningAreaId(null)} className="text-red-500"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {area.assignments[0]?.salesman ? (
                              <span className="font-medium text-slate-800 dark:text-slate-200">{area.assignments[0].salesman.name}</span>
                            ) : (
                              <span className="text-slate-400 italic">Route Default</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right space-x-3">
                        <button 
                          onClick={() => { setAssigningAreaId(area.id); setAssignmentSalesmanId(area.assignments[0]?.salesmanId || ''); }}
                          className="text-xs font-bold uppercase tracking-wider text-alvoun-blue hover:text-alvoun-dark"
                        >
                          Assign
                        </button>
                        <button 
                          onClick={() => startEditArea(area)}
                          className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CUSTOMERS TAB */}
      {activeTab === 'CUSTOMERS' && (
        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-900/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search customers..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-alvoun-blue/20 bg-white dark:bg-slate-950"
              />
            </div>
            <button 
              onClick={() => setShowAddCustomer(!showAddCustomer)}
              className="px-4 py-2 bg-alvoun-blue text-white rounded-lg text-sm font-bold hover:bg-alvoun-dark flex items-center gap-2 transition-colors w-full md:w-auto justify-center"
            >
              <Plus className="h-4 w-4" /> Add Customer
            </button>
          </div>

          {showAddCustomer && (
            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">New Customer in {route.name}</h3>
              <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Customer Name</label>
                  <input required type="text" value={customerForm.customerName} onChange={e => setCustomerForm({...customerForm, customerName: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                  <input required type="text" value={customerForm.contact} onChange={e => setCustomerForm({...customerForm, contact: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Area (Optional)</label>
                  <select value={customerForm.areaId} onChange={e => setCustomerForm({...customerForm, areaId: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950">
                    <option value="">No specific area</option>
                    {route.areas.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                  <input required type="text" value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Opening Balance</label>
                    <input type="number" required min="0" value={customerForm.openingBalance} onChange={e => setCustomerForm({...customerForm, openingBalance: Number(e.target.value)})} className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                    <select value={customerForm.openingBalanceType} onChange={e => setCustomerForm({...customerForm, openingBalanceType: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950">
                      <option value="DEBIT">Dues (Debit)</option>
                      <option value="CREDIT">Advance (Credit)</option>
                    </select>
                  </div>
                </div>
                
                <div className="md:col-span-2 flex items-center justify-end gap-3 mt-2">
                  <button type="button" onClick={() => setShowAddCustomer(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button type="submit" disabled={isSavingCustomer} className="px-4 py-2 bg-alvoun-blue text-white rounded-lg text-sm font-bold hover:bg-alvoun-dark disabled:opacity-50">
                    {isSavingCustomer ? 'Creating...' : 'Create Customer'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Customer Name</th>
                  <th className="px-6 py-3">Area</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No customers found in this route matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-6 py-3 font-bold text-slate-900 dark:text-slate-100">{c.customerName}</td>
                      <td className="px-6 py-3">
                        {movingCustomerId === c.id ? (
                          <div className="flex items-center gap-2">
                            <select 
                              value={moveToAreaId}
                              onChange={e => setMoveToAreaId(e.target.value)}
                              className="px-2 py-1 border border-alvoun-blue rounded-md w-32 text-xs"
                            >
                              <option value="">No Area</option>
                              {route.areas.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <button disabled={isMoving} onClick={() => handleMoveCustomer(c)} className="text-alvoun-green disabled:opacity-50"><Check className="h-4 w-4" /></button>
                            <button disabled={isMoving} onClick={() => setMovingCustomerId(null)} className="text-red-500 disabled:opacity-50"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400">{c.area?.name || <span className="italic text-slate-400">Route Direct</span>}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{c.contact}</td>
                      <td className="px-6 py-3 text-center">
                        {c.status === 'ACTIVE' ? (
                          <span className="text-alvoun-green font-bold text-xs uppercase">Active</span>
                        ) : (
                          <span className="text-slate-400 font-bold text-xs uppercase">Inactive</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right space-x-3">
                        <button 
                          onClick={() => { setMovingCustomerId(c.id); setMoveToAreaId(c.areaId || ''); }}
                          className="text-xs font-bold uppercase tracking-wider text-alvoun-blue hover:text-alvoun-dark"
                        >
                          Move
                        </button>
                        {c.status === 'ACTIVE' && (
                          <button 
                            onClick={() => handleDeactivateCustomer(c)}
                            className="text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-800"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

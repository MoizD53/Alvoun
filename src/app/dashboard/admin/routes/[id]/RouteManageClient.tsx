'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createArea, updateArea, assignSalesmanToArea } from '@/lib/actions/area';
import { createCustomer, moveCustomer, deactivateCustomer } from '@/lib/actions/customer';
import { Plus, Check, X, Search, MapPin, Map, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
      areaId: customerForm.areaId || undefined,
      openingBalance: Math.round(Number(customerForm.openingBalance || 0) * 100),
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
      c.contact?.toLowerCase().includes(q) ||
      (c.area?.name && c.area.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Messages */}
      {error && (
        <div className="bg-red-500/10 text-accent-terracotta px-4 py-3 rounded-2xl text-xs font-bold border border-red-500/30 flex items-center gap-2 shadow-raised-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold border border-emerald-500/30 flex items-center gap-2 shadow-raised-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Modern Inset Pill Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-sunken shadow-inset rounded-2xl border border-border-subtle max-w-fit">
        <button 
          onClick={() => setActiveTab('AREAS')}
          className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'AREAS' 
              ? 'bg-brand-teal text-white shadow-raised-sm' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          AREAS ({route.areas.length})
        </button>
        <button 
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'CUSTOMERS' 
              ? 'bg-brand-teal text-white shadow-raised-sm' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          CUSTOMERS ({route.customers.length})
        </button>
      </div>

      {/* AREAS TAB */}
      {activeTab === 'AREAS' && (
        <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle overflow-hidden">
          <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-surface/80">
            <h2 className="font-black text-text-primary flex items-center gap-2 tracking-tight">
              <Map className="h-4 w-4 text-brand-teal" /> Areas in {route.name}
            </h2>
            <button 
              onClick={() => setShowAddArea(!showAddArea)}
              className="px-4 py-2 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-xl text-xs font-black shadow-raised active:scale-95 flex items-center gap-1.5 transition-all"
            >
              <Plus className="h-4 w-4" /> Add Area
            </button>
          </div>

          {showAddArea && (
            <div className="p-5 bg-surface-sunken/60 shadow-inset border-b border-border-subtle animate-fade-in">
              <form onSubmit={handleAddArea} className="flex flex-wrap items-end gap-3 max-w-md">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Area Name</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={newAreaName}
                    onChange={e => setNewAreaName(e.target.value)}
                    placeholder="e.g. Station Road"
                    className="w-full mt-1.5 px-3.5 py-2.5 border border-border-subtle rounded-xl text-sm font-semibold text-text-primary bg-surface-raised shadow-inset-sm focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSavingArea}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-raised disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isSavingArea ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddArea(false)}
                  className="px-4 py-2.5 border border-border-subtle rounded-xl text-xs font-bold text-text-secondary bg-surface-raised shadow-raised-sm active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-surface/80 text-text-muted font-bold text-xs uppercase tracking-wider border-b border-border-subtle">
                <tr>
                  <th className="px-6 py-4">Area Name</th>
                  <th className="px-6 py-4 text-center">Customers</th>
                  <th className="px-6 py-4">Assigned Salesman</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {route.areas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-text-muted">
                      No areas yet. Click <span className="font-bold text-brand-teal">Add Area</span> above to create one.
                    </td>
                  </tr>
                ) : (
                  route.areas.map((area: any) => (
                    <tr key={area.id} className="hover:bg-surface-sunken/40 transition-colors">
                      <td className="px-6 py-4 font-black text-text-primary text-base">
                        {editingAreaId === area.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              autoFocus
                              type="text" 
                              value={editAreaName}
                              onChange={e => setEditAreaName(e.target.value)}
                              className="px-3 py-1.5 border border-brand-teal rounded-xl w-48 text-sm font-semibold bg-surface-raised shadow-inset-sm text-text-primary outline-none"
                            />
                            <button onClick={() => handleEditArea(area.id)} className="w-8 h-8 flex items-center justify-center bg-emerald-500/15 text-emerald-600 rounded-lg shadow-raised-sm active:scale-95"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setEditingAreaId(null)} className="w-8 h-8 flex items-center justify-center bg-red-500/15 text-accent-terracotta rounded-lg shadow-raised-sm active:scale-95"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          area.name
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded-full bg-surface-sunken shadow-inset-sm text-xs font-black text-text-primary border border-border-subtle px-2">
                          {area._count.customers}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {assigningAreaId === area.id ? (
                          <div className="flex items-center gap-2">
                            <select 
                              value={assignmentSalesmanId}
                              onChange={e => setAssignmentSalesmanId(e.target.value)}
                              className="px-3 py-1.5 border border-brand-teal rounded-xl w-44 text-xs font-semibold bg-surface-raised shadow-inset-sm text-text-primary outline-none"
                            >
                              <option value="">Select...</option>
                              {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button onClick={() => handleAssignArea(area.id)} className="w-8 h-8 flex items-center justify-center bg-emerald-500/15 text-emerald-600 rounded-lg shadow-raised-sm active:scale-95"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setAssigningAreaId(null)} className="w-8 h-8 flex items-center justify-center bg-red-500/15 text-accent-terracotta rounded-lg shadow-raised-sm active:scale-95"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {area.assignments[0]?.salesman ? (
                              <span className="font-bold text-text-primary">{area.assignments[0].salesman.name}</span>
                            ) : (
                              <span className="text-text-muted italic text-xs font-medium">Route Default</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => { setAssigningAreaId(area.id); setAssignmentSalesmanId(area.assignments[0]?.salesmanId || ''); }}
                          className="px-3 py-1.5 bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal border border-brand-teal/20 rounded-xl text-xs font-bold shadow-raised-sm active:scale-95 transition-all"
                        >
                          Assign
                        </button>
                        <button 
                          onClick={() => startEditArea(area)}
                          className="px-3 py-1.5 bg-surface-raised hover:bg-surface-sunken border border-border-subtle text-text-secondary rounded-xl text-xs font-bold shadow-raised-sm active:scale-95 transition-all"
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
        <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle overflow-hidden">
          <div className="p-5 border-b border-border-subtle flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface/80">
            <div className="relative flex-1 max-w-sm w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search customers..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-border-subtle rounded-2xl text-sm font-semibold bg-surface-sunken shadow-inset text-text-primary placeholder:text-text-muted focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
              />
            </div>
            <button 
              onClick={() => setShowAddCustomer(!showAddCustomer)}
              className="px-4 py-2.5 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-xl text-xs font-black shadow-raised active:scale-95 flex items-center gap-1.5 transition-all w-full md:w-auto justify-center"
            >
              <Plus className="h-4 w-4" /> Add Customer
            </button>
          </div>

          {showAddCustomer && (
            <div className="p-6 bg-surface-sunken/60 shadow-inset border-b border-border-subtle animate-fade-in">
              <h3 className="font-black text-text-primary mb-4 tracking-tight">New Customer in {route.name}</h3>
              <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Customer Name</label>
                  <input required type="text" value={customerForm.customerName} onChange={e => setCustomerForm({...customerForm, customerName: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-border-subtle rounded-xl text-sm font-semibold bg-surface-raised shadow-inset-sm text-text-primary focus:border-brand-teal outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Phone</label>
                  <input required type="text" value={customerForm.contact} onChange={e => setCustomerForm({...customerForm, contact: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-border-subtle rounded-xl text-sm font-semibold bg-surface-raised shadow-inset-sm text-text-primary focus:border-brand-teal outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Area (Optional)</label>
                  <select value={customerForm.areaId} onChange={e => setCustomerForm({...customerForm, areaId: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-border-subtle rounded-xl text-sm font-semibold bg-surface-raised shadow-inset-sm text-text-primary focus:border-brand-teal outline-none">
                    <option value="">No specific area</option>
                    {route.areas.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Address</label>
                  <input required type="text" value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-border-subtle rounded-xl text-sm font-semibold bg-surface-raised shadow-inset-sm text-text-primary focus:border-brand-teal outline-none" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Opening Balance</label>
                    <input type="number" required min="0" value={customerForm.openingBalance} onChange={e => setCustomerForm({...customerForm, openingBalance: Number(e.target.value)})} className="w-full mt-1.5 px-3.5 py-2.5 border border-border-subtle rounded-xl text-sm font-semibold bg-surface-raised shadow-inset-sm text-text-primary focus:border-brand-teal outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Type</label>
                    <select value={customerForm.openingBalanceType} onChange={e => setCustomerForm({...customerForm, openingBalanceType: e.target.value})} className="w-full mt-1.5 px-3.5 py-2.5 border border-border-subtle rounded-xl text-sm font-semibold bg-surface-raised shadow-inset-sm text-text-primary focus:border-brand-teal outline-none">
                      <option value="DEBIT">Dues (Debit)</option>
                      <option value="CREDIT">Advance (Credit)</option>
                    </select>
                  </div>
                </div>
                
                <div className="md:col-span-2 flex items-center justify-end gap-3 mt-3">
                  <button type="button" onClick={() => setShowAddCustomer(false)} className="px-4 py-2 border border-border-subtle rounded-xl text-xs font-bold text-text-secondary bg-surface-raised shadow-raised-sm active:scale-95 transition-all">Cancel</button>
                  <button type="submit" disabled={isSavingCustomer} className="px-5 py-2.5 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-xl text-xs font-black shadow-raised disabled:opacity-50 active:scale-95 transition-all">
                    {isSavingCustomer ? 'Creating...' : 'Create Customer'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-surface/80 text-text-muted font-bold text-xs uppercase tracking-wider border-b border-border-subtle">
                <tr>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Area</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                      No customers found in this route matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c: any) => (
                    <tr key={c.id} className="hover:bg-surface-sunken/40 transition-colors">
                      <td className="px-6 py-4 font-black text-text-primary text-base">{c.customerName}</td>
                      <td className="px-6 py-4">
                        {movingCustomerId === c.id ? (
                          <div className="flex items-center gap-2">
                            <select 
                              value={moveToAreaId}
                              onChange={e => setMoveToAreaId(e.target.value)}
                              className="px-2.5 py-1.5 border border-brand-teal rounded-xl w-36 text-xs font-semibold bg-surface-raised shadow-inset-sm text-text-primary outline-none"
                            >
                              <option value="">No Area</option>
                              {route.areas.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <button disabled={isMoving} onClick={() => handleMoveCustomer(c)} className="w-7 h-7 flex items-center justify-center bg-emerald-500/15 text-emerald-600 rounded-lg shadow-raised-sm active:scale-95 disabled:opacity-50"><Check className="h-4 w-4" /></button>
                            <button disabled={isMoving} onClick={() => setMovingCustomerId(null)} className="w-7 h-7 flex items-center justify-center bg-red-500/15 text-accent-terracotta rounded-lg shadow-raised-sm active:scale-95 disabled:opacity-50"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <span className="text-text-secondary font-medium">{c.area?.name || <span className="italic text-text-muted text-xs">Route Direct</span>}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-text-muted font-medium">{c.contact}</td>
                      <td className="px-6 py-4 text-center">
                        {c.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-surface-sunken text-text-muted border border-border-subtle">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => { setMovingCustomerId(c.id); setMoveToAreaId(c.areaId || ''); }}
                          className="px-3 py-1.5 bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal border border-brand-teal/20 rounded-xl text-xs font-bold shadow-raised-sm active:scale-95 transition-all"
                        >
                          Move
                        </button>
                        {c.status === 'ACTIVE' && (
                          <button 
                            onClick={() => handleDeactivateCustomer(c)}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-accent-terracotta border border-red-500/20 rounded-xl text-xs font-bold shadow-raised-sm active:scale-95 transition-all"
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

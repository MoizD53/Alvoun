'use client';

import React, { useState } from 'react';
import { ChevronDown, Loader2, X } from 'lucide-react';
import { 
  getSalesDetails, 
  getCollectionDetails, 
  getOutstandingDetails, 
  getVisitsDetails,
  getRoutesDetails,
  getAreasDetails,
  getSalesmenDetails,
  getCustomersDetails
} from '../actions/kpi-details';
import { formatMoney, formatNumber } from '@/lib/format';
import Link from 'next/link';
import { useKPIContext } from './KPIContext';
import { Button } from '@/components/ui/button';

export type KPIItem = {
  id: string;
  title: string;
  value: string | React.ReactNode;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
};

export default function InteractiveKPIRow({
  kpis,
  dateStr
}: {
  kpis: KPIItem[];
  dateStr?: string;
}) {
  const { expandedId, setExpandedId, kpiDataCache, setKpiDataCache } = useKPIContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Check if the globally expanded KPI belongs to this specific row component
  const isExpandedInThisRow = kpis.some(kpi => kpi.id === expandedId);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    
    setExpandedId(id);
    
    // If we already have the data, we don't need to fetch it again
    if (kpiDataCache[id]) {
      return;
    }

    setLoading(true);
    setError(false);

    try {
      let data;
      switch (id) {
        case 'sales': data = await getSalesDetails(dateStr); break;
        case 'collection': data = await getCollectionDetails(dateStr); break;
        case 'outstanding': data = await getOutstandingDetails(); break;
        case 'visits': data = await getVisitsDetails(dateStr); break;
        case 'routes': data = await getRoutesDetails(); break;
        case 'areas': data = await getAreasDetails(); break;
        case 'salesmen': data = await getSalesmenDetails(dateStr); break;
        case 'customers': data = await getCustomersDetails(); break;
      }
      setKpiDataCache(id, data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const renderDetails = (id: string) => {
    if (loading && !kpiDataCache[id]) {
      return (
        <div className="p-10 flex flex-col items-center justify-center text-secondary animate-pulse">
          <Loader2 className="h-8 w-8 animate-spin mb-3 text-teal-600 dark:text-teal-400" />
          <p className="text-sm font-medium">Loading details...</p>
        </div>
      );
    }

    if (error && !kpiDataCache[id]) {
      return (
        <div className="p-8 flex flex-col items-center justify-center text-danger">
          <p className="mb-4 text-sm font-semibold">Unable to load details.</p>
          <Button 
            variant="danger-outline"
            size="sm"
            onClick={() => handleExpand(id)}
          >
            Retry
          </Button>
        </div>
      );
    }

    const detailsData = kpiDataCache[id];
    if (!detailsData) return null;

    if (id === 'sales') {
      return (
        <div className="p-6 pr-14 md:pr-16 bg-surface-raised/40 rounded-b-2xl border-t border-border-default">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">TODAY&apos;S SALES</h4>
              <div className="grid grid-cols-2 gap-3.5 mb-4">
                <div className="p-3.5 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Total Volume</div>
                  <div className="text-lg font-bold text-primary mt-0.5">{formatMoney(detailsData.total)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Orders Count</div>
                  <div className="text-lg font-bold text-primary mt-0.5">{formatNumber(detailsData.orders)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-inset border border-border-default shadow-inset col-span-2">
                  <div className="text-xs text-secondary font-medium">Average Order Value</div>
                  <div className="text-lg font-bold text-primary mt-0.5">{formatMoney(detailsData.avgOrder)}</div>
                </div>
              </div>
              <Link href="/dashboard/admin/reports" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
                View Full Sales Report &rarr;
              </Link>
            </div>
            <div className="flex-1 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">SALESMAN BREAKDOWN</h4>
              <div className="p-3.5 rounded-xl bg-surface-inset border border-border-default shadow-inset space-y-2.5 max-h-56 overflow-y-auto">
                {detailsData.salesmen.map((s: any) => (
                  <div key={s.name} className="flex justify-between items-center text-xs">
                    <span className="text-secondary font-medium">{s.name}</span>
                    <span className="font-mono font-bold text-primary">{formatMoney(s.amount)}</span>
                  </div>
                ))}
                {detailsData.salesmen.length === 0 && <div className="text-xs text-muted py-2 text-center">No sales recorded today</div>}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (id === 'collection') {
      return (
        <div className="p-6 pr-14 md:pr-16 bg-surface-raised/40 rounded-b-2xl border-t border-border-default">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">TODAY&apos;S COLLECTION</h4>
              <div className="p-3.5 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                <div className="text-xs text-secondary font-medium">Total Received</div>
                <div className="text-xl font-bold text-success mt-0.5">{formatMoney(detailsData.total)}</div>
              </div>
              <h5 className="font-bold text-xs text-muted uppercase tracking-wider mt-4">PAYMENT METHODS</h5>
              <div className="p-3.5 rounded-xl bg-surface-inset border border-border-default shadow-inset space-y-2">
                {detailsData.methods.map((m: any) => (
                  <div key={m.name} className="flex justify-between items-center text-xs">
                    <span className="text-secondary font-medium">{m.name}</span>
                    <span className="font-mono font-bold text-primary">{formatMoney(m.amount)}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/admin/reports" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
                View Collection Report &rarr;
              </Link>
            </div>
            <div className="flex-1 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">SALESMAN COLLECTION</h4>
              <div className="p-3.5 rounded-xl bg-surface-inset border border-border-default shadow-inset space-y-2.5 max-h-56 overflow-y-auto">
                {detailsData.salesmen.map((s: any) => (
                  <div key={s.name} className="flex justify-between items-center text-xs">
                    <span className="text-secondary font-medium">{s.name}</span>
                    <span className="font-mono font-bold text-primary">{formatMoney(s.amount)}</span>
                  </div>
                ))}
                {detailsData.salesmen.length === 0 && <div className="text-xs text-muted py-2 text-center">No collections today</div>}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (id === 'outstanding') {
      return (
        <div className="p-6 pr-14 md:pr-16 bg-surface-raised/40 rounded-b-2xl border-t border-border-default">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">TOTAL MARKET DUES</h4>
              <div className="grid grid-cols-2 gap-3.5 mb-3">
                <div className="p-3.5 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Total Outstanding</div>
                  <div className="text-lg font-bold text-danger mt-0.5">{formatMoney(detailsData.total)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Customers with Dues</div>
                  <div className="text-lg font-bold text-primary mt-0.5">{formatNumber(detailsData.customersWithDues)}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-inset border border-border-default shadow-inset space-y-2 text-xs">
                <div className="flex justify-between text-secondary">
                  <span>0–₹5,000</span>
                  <span className="font-mono font-bold text-primary">{detailsData.ranges['0–5,000']} customers</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>₹5,000–₹10,000</span>
                  <span className="font-mono font-bold text-primary">{detailsData.ranges['5,000–10,000']} customers</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>₹10,000+</span>
                  <span className="font-mono font-bold text-danger">{detailsData.ranges['10,000+']} customers</span>
                </div>
              </div>

              <Link href="/dashboard/admin/reports/outstanding" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
                View Dues Breakdown &rarr;
              </Link>
            </div>
            <div className="flex-1 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">TOP OUTSTANDING CUSTOMERS</h4>
              <div className="p-3.5 rounded-xl bg-surface-inset border border-border-default shadow-inset space-y-2.5 max-h-56 overflow-y-auto">
                {detailsData.topCustomers.map((c: any) => (
                  <div key={c.name} className="flex justify-between items-center text-xs">
                    <span className="text-secondary font-medium truncate pr-2">{c.name}</span>
                    <span className="font-mono font-bold text-danger shrink-0">{formatMoney(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (id === 'visits') {
      return (
        <div className="p-6 pr-14 md:pr-16 bg-surface-raised/40 rounded-b-2xl border-t border-border-default">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">TODAY&apos;S VISITS</h4>
              <div className="grid grid-cols-2 gap-3.5 mb-3">
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Visited</div>
                  <div className="text-lg font-bold text-success mt-0.5">{formatNumber(detailsData.visited)}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Pending</div>
                  <div className="text-lg font-bold text-warning mt-0.5">{formatNumber(detailsData.pending)}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">No Sale</div>
                  <div className="text-lg font-bold text-muted mt-0.5">{formatNumber(detailsData.noSale)}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Total Base</div>
                  <div className="text-lg font-bold text-primary mt-0.5">{formatNumber(detailsData.totalCustomers)}</div>
                </div>
              </div>
              
              <Link href="/dashboard/admin/reports" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
                View Visits Log &rarr;
              </Link>
            </div>
            <div className="flex-1 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">SALESMAN VISITS</h4>
              <div className="p-3.5 rounded-xl bg-surface-inset border border-border-default shadow-inset space-y-2.5 max-h-56 overflow-y-auto">
                {detailsData.salesmen.map((s: any) => (
                  <div key={s.name} className="flex justify-between items-center text-xs">
                    <span className="text-secondary font-medium">{s.name}</span>
                    <span className="font-mono font-bold text-primary">{formatNumber(s.count)} visits</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (id === 'routes') {
      return (
        <div className="p-6 pr-14 md:pr-16 bg-surface-raised/40 rounded-b-2xl border-t border-border-default">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">ROUTES SUMMARY</h4>
              <div className="p-3.5 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                <div className="text-xs text-secondary font-medium">Total Active Routes</div>
                <div className="text-xl font-bold text-primary mt-0.5">{formatNumber(detailsData.total)}</div>
              </div>
              <Link href="/dashboard/admin/routes" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
                Manage Routes &rarr;
              </Link>
            </div>
            <div className="flex-[2]">
              <div className="overflow-x-auto rounded-xl border border-border-default shadow-inset bg-surface-inset">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-raised text-muted uppercase font-semibold border-b border-border-default">
                    <tr>
                      <th className="px-4 py-2.5">Route</th>
                      <th className="px-4 py-2.5">Areas</th>
                      <th className="px-4 py-2.5">Customers</th>
                      <th className="px-4 py-2.5">Salesman</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {detailsData.list.map((r: any) => (
                      <tr key={r.name} className="hover:bg-surface-raised/40 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-primary">{r.name}</td>
                        <td className="px-4 py-2.5 text-secondary">{r.areasCount}</td>
                        <td className="px-4 py-2.5 text-secondary font-mono">{r.customersCount}</td>
                        <td className="px-4 py-2.5 text-secondary">{r.salesmanName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (id === 'areas') {
      return (
        <div className="p-6 pr-14 md:pr-16 bg-surface-raised/40 rounded-b-2xl border-t border-border-default">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">AREAS SUMMARY</h4>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Total</div>
                  <div className="text-lg font-bold text-primary mt-0.5">{formatNumber(detailsData.total)}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Assigned</div>
                  <div className="text-lg font-bold text-success mt-0.5">{formatNumber(detailsData.assignedCount)}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset col-span-2">
                  <div className="text-xs text-secondary font-medium">Unassigned</div>
                  <div className="text-lg font-bold text-danger mt-0.5">{formatNumber(detailsData.unassignedCount)}</div>
                </div>
              </div>
              <Link href="/dashboard/admin/routes" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
                Manage Territories &rarr;
              </Link>
            </div>
            <div className="flex-[2]">
              <div className="max-h-60 overflow-y-auto overflow-x-auto border border-border-default rounded-xl bg-surface-inset shadow-inset">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-raised text-muted uppercase font-semibold border-b border-border-default sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">Area</th>
                      <th className="px-4 py-2.5">Route</th>
                      <th className="px-4 py-2.5">Customers</th>
                      <th className="px-4 py-2.5">Assigned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {detailsData.list.map((a: any) => (
                      <tr key={a.name} className="hover:bg-surface-raised/40 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-primary">{a.name}</td>
                        <td className="px-4 py-2.5 text-secondary">{a.routeName}</td>
                        <td className="px-4 py-2.5 text-secondary font-mono">{a.customersCount}</td>
                        <td className={`px-4 py-2.5 ${a.salesmanName === 'Unassigned' ? 'text-danger font-semibold' : 'text-secondary'}`}>{a.salesmanName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (id === 'salesmen') {
      return (
        <div className="p-6 pr-14 md:pr-16 bg-surface-raised/40 rounded-b-2xl border-t border-border-default">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">SALESMEN SUMMARY</h4>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Total Staff</div>
                  <div className="text-lg font-bold text-primary mt-0.5">{formatNumber(detailsData.total)}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Working</div>
                  <div className="text-lg font-bold text-success mt-0.5">{formatNumber(detailsData.working)}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Not Started</div>
                  <div className="text-lg font-bold text-muted mt-0.5">{formatNumber(detailsData.notStarted)}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Completed</div>
                  <div className="text-lg font-bold text-teal-600 dark:text-teal-400 mt-0.5">{formatNumber(detailsData.completed)}</div>
                </div>
              </div>
              <Link href="/dashboard/admin/salesmen" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
                Manage Staff &rarr;
              </Link>
            </div>
            <div className="flex-[2] space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">FIELD PERFORMANCE</h4>
              <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-inset shadow-inset">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-raised text-muted uppercase font-semibold border-b border-border-default">
                    <tr>
                      <th className="px-4 py-2.5">Salesman</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Sales</th>
                      <th className="px-4 py-2.5 text-right">Collection</th>
                      <th className="px-4 py-2.5 text-right">Visits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {detailsData.performance.map((s: any) => (
                      <tr key={s.name} className="hover:bg-surface-raised/40 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-primary">{s.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            s.status === 'Working' ? 'bg-success-bg text-success border border-success/30' :
                            s.status === 'Completed' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200/50' :
                            s.status === 'Inactive' ? 'bg-danger-bg text-danger border border-danger/30' :
                            'bg-surface-raised text-secondary border border-border-default'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              s.status === 'Working' ? 'bg-success' :
                              s.status === 'Completed' ? 'bg-teal-500' :
                              s.status === 'Inactive' ? 'bg-danger' :
                              'bg-text-muted'
                            }`} />
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium text-primary">{formatMoney(s.sales)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium text-primary">{formatMoney(s.collection)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-secondary">{formatNumber(s.visits)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (id === 'customers') {
      return (
        <div className="p-6 pr-14 md:pr-16 bg-surface-raised/40 rounded-b-2xl border-t border-border-default">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">CUSTOMERS OVERVIEW</h4>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Total Customers</div>
                  <div className="text-lg font-bold text-primary mt-0.5">{formatNumber(detailsData.total)}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Active</div>
                  <div className="text-lg font-bold text-success mt-0.5">{formatNumber(detailsData.active)}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Assigned</div>
                  <div className="text-lg font-bold text-primary mt-0.5">{formatNumber(detailsData.assigned)}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset">
                  <div className="text-xs text-secondary font-medium">Unassigned</div>
                  <div className="text-lg font-bold text-danger mt-0.5">{formatNumber(detailsData.unassigned)}</div>
                </div>
              </div>
              <Link href="/dashboard/admin/customers" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1">
                View All Customers &rarr;
              </Link>
            </div>
            <div className="flex-1 flex gap-6">
              <div className="flex-1 space-y-3">
                <h5 className="font-bold text-xs text-muted uppercase tracking-wider">BY ROUTE</h5>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset space-y-2 text-xs max-h-52 overflow-y-auto">
                  {detailsData.byRoute.map((r: any) => (
                    <div key={r.name} className="flex justify-between items-center">
                      <span className="text-secondary font-medium truncate pr-2">{r.name}</span>
                      <span className="font-mono font-bold text-primary">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <h5 className="font-bold text-xs text-muted uppercase tracking-wider">BY AREA</h5>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-default shadow-inset space-y-2 text-xs max-h-52 overflow-y-auto">
                  {detailsData.byArea.map((a: any) => (
                    <div key={a.name} className="flex justify-between items-center">
                      <span className="text-secondary font-medium truncate pr-2">{a.name}</span>
                      <span className="font-mono font-bold text-primary">{a.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Neumorphic 4-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpis.map((kpi) => {
          const isExpanded = expandedId === kpi.id;
          return (
            <div key={kpi.id} className="relative">
              <button 
                type="button"
                onClick={() => handleExpand(kpi.id)}
                className={`w-full text-left bg-surface-raised border border-border-default shadow-raised rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 outline-none hover:shadow-modal hover:-translate-y-0.5 group cursor-pointer relative select-none ${
                  isExpanded 
                    ? 'ring-2 ring-teal-500 border-teal-500 rounded-b-none border-b-0 shadow-modal z-10' 
                    : ''
                }`}
                aria-expanded={isExpanded}
              >
                {/* Header: Title + Tactile Icon Well */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-[0.15em] select-none">
                    {kpi.title}
                  </h3>
                  <div className="h-10 w-10 rounded-xl bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform duration-200">
                    {kpi.icon}
                  </div>
                </div>

                {/* Values & Subtitle */}
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight font-sans">
                    {kpi.value}
                  </div>
                  <div className="text-xs font-medium text-secondary mt-2 flex items-center justify-between">
                    <span>{kpi.subtitle}</span>
                    <span className="text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <span>Details</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Neumorphic Expansion Panel */}
      {isExpandedInThisRow && expandedId && (
        <div className="bg-surface-overlay border border-border-default shadow-modal rounded-2xl overflow-hidden animate-scale-in relative z-0 -mt-5 md:-mt-7 pt-4">
          <button 
            type="button"
            onClick={() => setExpandedId(null)} 
            className="absolute top-[24px] right-4 md:right-6 p-2 rounded-xl bg-surface-raised border border-border-default shadow-xs text-secondary hover:text-primary hover:border-border-strong transition-colors z-20 cursor-pointer press-active" 
            aria-label="Close details" 
            title="Close details"
          >
            <X className="h-4 w-4" />
          </button>
          {renderDetails(expandedId)}
        </div>
      )}
    </div>
  );
}

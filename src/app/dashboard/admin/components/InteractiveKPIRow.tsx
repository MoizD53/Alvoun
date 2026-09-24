'use client';

import React, { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [error, setError] = useState(false);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    
    setExpandedId(id);
    setLoading(true);
    setError(false);
    setDetailsData(null);

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
      setDetailsData(data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const renderDetails = (id: string) => {
    if (loading) {
      return (
        <div className="p-8 flex flex-col items-center justify-center text-slate-500 animate-pulse">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Loading details...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-8 flex flex-col items-center justify-center text-red-500">
          <p className="mb-4">Unable to load details.</p>
          <button 
            onClick={() => handleExpand(id)}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!detailsData) return null;

    if (id === 'sales') {
      return (
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-b-xl border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">TODAY'S SALES</h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-slate-500">Total</div>
                  <div className="text-xl font-bold">{formatMoney(detailsData.total)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Orders</div>
                  <div className="text-xl font-bold">{formatNumber(detailsData.orders)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Average Order</div>
                  <div className="text-xl font-bold">{formatMoney(detailsData.avgOrder)}</div>
                </div>
              </div>
              <Link href="/dashboard/admin/reports" className="text-sm font-medium text-alvoun-blue hover:underline">
                View Sales Report &rarr;
              </Link>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">SALESMAN BREAKDOWN</h4>
              <div className="space-y-3">
                {detailsData.salesmen.map((s: any) => (
                  <div key={s.name} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{s.name}</span>
                    <span className="font-medium">{formatMoney(s.amount)}</span>
                  </div>
                ))}
                {detailsData.salesmen.length === 0 && <div className="text-sm text-slate-500">No sales today</div>}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (id === 'collection') {
      return (
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-b-xl border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">TODAY'S COLLECTION</h4>
              <div className="mb-6">
                <div className="text-sm text-slate-500">Total</div>
                <div className="text-xl font-bold">{formatMoney(detailsData.total)}</div>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3 mt-4">PAYMENT METHOD</h4>
              <div className="space-y-2 mb-6">
                {detailsData.methods.map((m: any) => (
                  <div key={m.name} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{m.name}</span>
                    <span className="font-medium">{formatMoney(m.amount)}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/admin/reports" className="text-sm font-medium text-alvoun-blue hover:underline">
                View Collection Report &rarr;
              </Link>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">SALESMAN COLLECTION</h4>
              <div className="space-y-3">
                {detailsData.salesmen.map((s: any) => (
                  <div key={s.name} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{s.name}</span>
                    <span className="font-medium">{formatMoney(s.amount)}</span>
                  </div>
                ))}
                {detailsData.salesmen.length === 0 && <div className="text-sm text-slate-500">No collection today</div>}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (id === 'outstanding') {
      return (
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-b-xl border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">TOTAL OUTSTANDING</h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-slate-500">Total</div>
                  <div className="text-xl font-bold">{formatMoney(detailsData.total)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Customers with Dues</div>
                  <div className="text-xl font-bold">{formatNumber(detailsData.customersWithDues)}</div>
                </div>
              </div>

              <div className="space-y-2 mb-6 text-sm">
                <div className="flex justify-between text-slate-500"><span className="w-24">0–₹5,000</span> <span className="font-medium text-slate-900 dark:text-slate-100">{detailsData.ranges['0–5,000']} customers</span></div>
                <div className="flex justify-between text-slate-500"><span className="w-24">₹5,000–₹10,000</span> <span className="font-medium text-slate-900 dark:text-slate-100">{detailsData.ranges['5,000–10,000']} customers</span></div>
                <div className="flex justify-between text-slate-500"><span className="w-24">₹10,000+</span> <span className="font-medium text-slate-900 dark:text-slate-100">{detailsData.ranges['10,000+']} customers</span></div>
              </div>

              <Link href="/dashboard/admin/reports" className="text-sm font-medium text-alvoun-blue hover:underline">
                View Outstanding &rarr;
              </Link>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">TOP OUTSTANDING</h4>
              <div className="space-y-3">
                {detailsData.topCustomers.map((c: any) => (
                  <div key={c.name} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                    <span className="font-medium text-red-500">{formatMoney(c.amount)}</span>
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
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-b-xl border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">TODAY'S VISITS</h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-slate-500">Visited</div>
                  <div className="text-xl font-bold">{formatNumber(detailsData.visited)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Pending</div>
                  <div className="text-xl font-bold">{formatNumber(detailsData.pending)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">No Sale</div>
                  <div className="text-xl font-bold">{formatNumber(detailsData.noSale)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Total Customers</div>
                  <div className="text-xl font-bold">{formatNumber(detailsData.totalCustomers)}</div>
                </div>
              </div>
              
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">VISIT STATUS</h4>
              <div className="space-y-2 mb-6 text-sm">
                {Object.entries(detailsData.statuses).map(([status, count]: [string, any]) => (
                  <div key={status} className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300">{status}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>

              <Link href="/dashboard/admin/reports" className="text-sm font-medium text-alvoun-blue hover:underline">
                View Visits &rarr;
              </Link>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">SALESMAN VISITS</h4>
              <div className="space-y-3">
                {detailsData.salesmen.map((s: any) => (
                  <div key={s.name} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{s.name}</span>
                    <span className="font-medium">{formatNumber(s.count)}</span>
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
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-b-xl border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">ROUTES</h4>
              <div className="mb-6">
                <div className="text-sm text-slate-500">Total</div>
                <div className="text-xl font-bold">{formatNumber(detailsData.total)}</div>
              </div>
              <Link href="/dashboard/admin/routes" className="text-sm font-medium text-alvoun-blue hover:underline">
                Manage Routes &rarr;
              </Link>
            </div>
            <div className="flex-[2]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Route Name</th>
                      <th className="px-4 py-2 font-medium">Areas</th>
                      <th className="px-4 py-2 font-medium">Customers</th>
                      <th className="px-4 py-2 font-medium">Assigned Salesman</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {detailsData.list.map((r: any) => (
                      <tr key={r.name}>
                        <td className="px-4 py-2 font-medium">{r.name}</td>
                        <td className="px-4 py-2 text-slate-500">{r.areasCount}</td>
                        <td className="px-4 py-2 text-slate-500">{r.customersCount}</td>
                        <td className="px-4 py-2 text-slate-500">{r.salesmanName}</td>
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
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-b-xl border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">AREAS</h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-slate-500">Total</div>
                  <div className="text-xl font-bold">{formatNumber(detailsData.total)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Assigned</div>
                  <div className="text-xl font-bold text-alvoun-green">{formatNumber(detailsData.assignedCount)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Unassigned</div>
                  <div className="text-xl font-bold text-red-500">{formatNumber(detailsData.unassignedCount)}</div>
                </div>
              </div>
              <Link href="/dashboard/admin/routes" className="text-sm font-medium text-alvoun-blue hover:underline">
                Manage Territories &rarr;
              </Link>
            </div>
            <div className="flex-[2]">
              <div className="max-h-60 overflow-y-auto overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-medium">Area</th>
                      <th className="px-4 py-2 font-medium">Route</th>
                      <th className="px-4 py-2 font-medium">Customers</th>
                      <th className="px-4 py-2 font-medium">Assigned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {detailsData.list.map((a: any) => (
                      <tr key={a.name}>
                        <td className="px-4 py-2 font-medium">{a.name}</td>
                        <td className="px-4 py-2 text-slate-500">{a.routeName}</td>
                        <td className="px-4 py-2 text-slate-500">{a.customersCount}</td>
                        <td className={`px-4 py-2 ${a.salesmanName === 'Unassigned' ? 'text-red-500 font-medium' : 'text-slate-500'}`}>{a.salesmanName}</td>
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
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-b-xl border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">SALESMEN</h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-slate-500">Total</div>
                  <div className="text-xl font-bold">{formatNumber(detailsData.total)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Working</div>
                  <div className="text-xl font-bold text-alvoun-green">{formatNumber(detailsData.working)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Not Started</div>
                  <div className="text-xl font-bold text-slate-500">{formatNumber(detailsData.notStarted)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Completed</div>
                  <div className="text-xl font-bold text-alvoun-blue">{formatNumber(detailsData.completed)}</div>
                </div>
              </div>
              <Link href="/dashboard/admin/salesmen" className="text-sm font-medium text-alvoun-blue hover:underline">
                Manage Salesmen &rarr;
              </Link>
            </div>
            <div className="flex-[2]">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">SALESMAN PERFORMANCE</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Salesman</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium text-right">Sales</th>
                      <th className="px-4 py-2 font-medium text-right">Collection</th>
                      <th className="px-4 py-2 font-medium text-right">Visits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {detailsData.performance.map((s: any) => (
                      <tr key={s.name}>
                        <td className="px-4 py-2 font-medium">{s.name}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${
                            s.status === 'Working' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                            s.status === 'Completed' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                            s.status === 'Inactive' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              s.status === 'Working' ? 'bg-green-500' :
                              s.status === 'Completed' ? 'bg-blue-500' :
                              s.status === 'Inactive' ? 'bg-red-500' :
                              'bg-slate-500'
                            }`}></span>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">{formatMoney(s.sales)}</td>
                        <td className="px-4 py-2 text-right">{formatMoney(s.collection)}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(s.visits)}</td>
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
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-b-xl border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">CUSTOMERS</h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-slate-500">Total</div>
                  <div className="text-xl font-bold">{formatNumber(detailsData.total)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Active</div>
                  <div className="text-xl font-bold text-alvoun-green">{formatNumber(detailsData.active)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Assigned</div>
                  <div className="text-xl font-bold">{formatNumber(detailsData.assigned)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Unassigned</div>
                  <div className="text-xl font-bold text-red-500">{formatNumber(detailsData.unassigned)}</div>
                </div>
              </div>
              <Link href="/dashboard/admin/customers" className="text-sm font-medium text-alvoun-blue hover:underline">
                View Customers &rarr;
              </Link>
            </div>
            <div className="flex-1 flex gap-8">
              <div className="flex-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">BY ROUTE</h4>
                <div className="space-y-2 text-sm">
                  {detailsData.byRoute.map((r: any) => (
                    <div key={r.name} className="flex justify-between">
                      <span className="text-slate-700 dark:text-slate-300 truncate pr-2 max-w-[120px]">{r.name}</span>
                      <span className="font-medium">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">BY AREA</h4>
                <div className="space-y-2 text-sm">
                  {detailsData.byArea.map((a: any) => (
                    <div key={a.name} className="flex justify-between">
                      <span className="text-slate-700 dark:text-slate-300 truncate pr-2 max-w-[120px]">{a.name}</span>
                      <span className="font-medium">{a.count}</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpis.map((kpi) => {
          const isExpanded = expandedId === kpi.id;
          return (
            <div key={kpi.id} className="relative">
              <button 
                onClick={() => handleExpand(kpi.id)}
                className={`w-full text-left bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between transition-all outline-none focus-visible:ring-2 focus-visible:ring-alvoun-blue hover:border-alvoun-blue/50 dark:hover:border-alvoun-blue/50 group ${isExpanded ? 'ring-2 ring-alvoun-blue rounded-b-none border-b-0 shadow-md z-10 relative' : ''}`}
                aria-expanded={isExpanded}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{kpi.title}</h3>
                  <div className={`h-8 w-8 rounded-full ${kpi.iconBg} flex items-center justify-center ${kpi.iconColor}`}>
                    {kpi.icon}
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{kpi.value}</div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between">
                    <span>{kpi.subtitle}</span>
                    <span className="text-alvoun-blue flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Details <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Expansion Panel (Desktop: Below row, Mobile: Below all cards - Wait, if mobile is 1 col, it should be below the clicked card) */}
      {expandedId && (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 relative z-0 -mt-5 md:-mt-7 pt-4">
          {renderDetails(expandedId)}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, User, MapPin, Activity, Settings, UserCog, UserCheck, UserX } from 'lucide-react';

export default function SalesmanList({ initialSalesmen }: { initialSalesmen: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loginAccessFilter, setLoginAccessFilter] = useState('ALL');

  const filteredSalesmen = initialSalesmen.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.profile?.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || 
                          (statusFilter === 'ACTIVE' && s.isActive) ||
                          (statusFilter === 'INACTIVE' && !s.isActive);
                          
    const matchesLogin = loginAccessFilter === 'ALL' || 
                         (loginAccessFilter === 'ACTIVE' && s.profile?.isActive) ||
                         (loginAccessFilter === 'DISABLED' && !s.profile?.isActive);
                         
    return matchesSearch && matchesStatus && matchesLogin;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder="Search salesmen, emp code, login ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alvoun-blue transition-colors sm:text-sm"
          />
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full sm:w-auto pl-3 pr-10 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-alvoun-blue transition-colors sm:text-sm appearance-none"
          >
            <option value="ALL">Business Status: All</option>
            <option value="ACTIVE">Business Status: Active</option>
            <option value="INACTIVE">Business Status: Inactive</option>
          </select>

          <select
            value={loginAccessFilter}
            onChange={(e) => setLoginAccessFilter(e.target.value)}
            className="block w-full sm:w-auto pl-3 pr-10 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-alvoun-blue transition-colors sm:text-sm appearance-none"
          >
            <option value="ALL">Login Access: All</option>
            <option value="ACTIVE">Login Access: Active</option>
            <option value="DISABLED">Login Access: Disabled</option>
          </select>
          
          <Link
            href="/dashboard/admin/salesmen/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-alvoun-blue hover:bg-alvoun-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-alvoun-blue transition-colors whitespace-nowrap"
          >
            <Plus className="h-5 w-5 mr-2 -ml-1" />
            Add Salesman
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-950 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Salesman
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Login ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Route
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-950 divide-y divide-slate-200 dark:divide-slate-800">
              {filteredSalesmen.map((salesman) => (
                <tr key={salesman.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{salesman.name}</div>
                        <div className="text-sm text-slate-500">{salesman.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{salesman.profile?.email || 'N/A'}</div>
                    <div className="flex items-center mt-1">
                      {salesman.profile?.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <UserCheck className="w-3 h-3 mr-1" /> Login Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          <UserX className="w-3 h-3 mr-1" /> Login Disabled
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {salesman.routes && salesman.routes.length > 0 ? (
                      <div className="flex flex-col">
                        {salesman.routes.map((r: any) => (
                          <div key={r.id} className="text-sm text-slate-900 dark:text-slate-100 flex items-center">
                            <MapPin className="w-3 h-3 mr-1 text-slate-400" /> {r.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      {salesman.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 w-fit">
                          Active Business
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 w-fit">
                          Inactive Business
                        </span>
                      )}
                      
                      {/* Today's Work Status */}
                      {salesman.workSessions && salesman.workSessions.length > 0 ? (
                        <div className="text-xs mt-2 text-slate-500 flex items-center">
                          <Activity className="w-3 h-3 mr-1 text-green-500" />
                          Working ({salesman.workSessions[0].status})
                        </div>
                      ) : (
                        <div className="text-xs mt-2 text-slate-400 flex items-center">
                          <Activity className="w-3 h-3 mr-1" />
                          Not started today
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/dashboard/admin/salesmen/${salesman.id}`}
                      className="text-alvoun-blue hover:text-alvoun-blue/80 bg-alvoun-light dark:bg-alvoun-blue/10 px-3 py-1.5 rounded-md inline-flex items-center transition-colors"
                    >
                      <UserCog className="h-4 w-4 mr-1" />
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              
              {filteredSalesmen.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No salesmen found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

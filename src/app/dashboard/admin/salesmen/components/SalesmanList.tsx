'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, Plus, MapPin, Activity, UserCog, 
  UserCheck, UserX, Loader2, CheckCircle2, AlertCircle, Phone 
} from 'lucide-react';
import { toggleSalesmanStatus } from '@/lib/actions/admin/salesman-management';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertBanner } from '@/components/ui/alert-banner';

export default function SalesmanList({ initialSalesmen }: { initialSalesmen: any[] }) {
  const router = useRouter();
  const [salesmen, setSalesmen] = useState(initialSalesmen);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loginAccessFilter, setLoginAccessFilter] = useState('ALL');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setSalesmen(initialSalesmen);
  }, [initialSalesmen]);

  const handleToggleStatus = async (salesmanId: string, currentActive: boolean) => {
    setActionError(null);
    setTogglingId(salesmanId);
    const nextStatus = !currentActive;

    try {
      const res = await toggleSalesmanStatus(salesmanId, nextStatus);
      if (res?.error) {
        throw new Error(res.error);
      }

      // Immediately update local state without waiting for full reload
      setSalesmen(prev => prev.map(s => {
        if (s.id === salesmanId) {
          return {
            ...s,
            isActive: nextStatus,
            profile: s.profile ? { ...s.profile, isActive: nextStatus } : s.profile
          };
        }
        return s;
      }));

      router.refresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update salesman status.');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredSalesmen = salesmen.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.profile?.email && s.profile.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (s.phone && s.phone.includes(searchTerm));
    
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
      {actionError && (
        <AlertBanner
          variant="danger"
          title="Action failed"
          onClose={() => setActionError(null)}
        >
          {actionError}
        </AlertBanner>
      )}

      {/* Filter and Action Bar */}
      <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search salesmen by name, phone, or login ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-inset shadow-inset border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>
        
        <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-initial rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="ALL">Status: All</option>
            <option value="ACTIVE">Status: Active</option>
            <option value="INACTIVE">Status: Inactive</option>
          </select>

          <select
            value={loginAccessFilter}
            onChange={(e) => setLoginAccessFilter(e.target.value)}
            className="flex-1 sm:flex-initial rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="ALL">Login: All</option>
            <option value="ACTIVE">Login: Enabled</option>
            <option value="DISABLED">Login: Disabled</option>
          </select>
          
          <Link
            href="/dashboard/admin/salesmen/new"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold shadow-raised hover:shadow-raised-sm press-active transition-all whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add Salesman
          </Link>
        </div>
      </div>

      {/* Salesmen Table Card */}
      <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
              <tr>
                <th scope="col" className="px-6 py-4">Salesman</th>
                <th scope="col" className="px-6 py-4">Login ID</th>
                <th scope="col" className="px-6 py-4">Route Assignment</th>
                <th scope="col" className="px-6 py-4">Status & Activity</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-surface-raised">
              {filteredSalesmen.map((salesman) => (
                <tr key={salesman.id} className="hover:bg-surface-inset/30 transition-colors">
                  {/* Salesman Info with Avatar */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3.5">
                      <Avatar 
                        alt={salesman.name} 
                        size="md" 
                        className="shadow-raised-sm border border-border/40"
                      />
                      <div>
                        <div className="font-bold text-foreground text-sm tracking-tight">{salesman.name}</div>
                        {salesman.phone && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-primary" /> {salesman.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Login ID & Access Status */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground">{salesman.profile?.email || 'N/A'}</div>
                    <div className="mt-1">
                      {salesman.profile?.isActive ? (
                        <Badge 
                          variant="success" 
                          size="sm" 
                          leftIcon={<UserCheck className="w-3.5 h-3.5 shrink-0" />}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5"
                        >
                          Login Active
                        </Badge>
                      ) : (
                        <Badge 
                          variant="danger" 
                          size="sm" 
                          leftIcon={<UserX className="w-3.5 h-3.5 shrink-0" />}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5"
                        >
                          Login Disabled
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Assigned Routes */}
                  <td className="px-6 py-4">
                    {(() => {
                      const allRoutesMap = new Map();
                      if (salesman.routes) {
                        salesman.routes.forEach((r: any) => allRoutesMap.set(r.id, r.name));
                      }
                      if (salesman.assignments) {
                        salesman.assignments.forEach((a: any) => {
                          if (a.route) allRoutesMap.set(a.route.id, a.route.name);
                        });
                      }
                      const uniqueRoutes = Array.from(allRoutesMap.entries());

                      return uniqueRoutes.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {uniqueRoutes.map(([id, name]) => (
                            <Badge 
                              key={id} 
                              variant="neutral" 
                              styleType="outline" 
                              size="sm" 
                              leftIcon={<MapPin className="w-3 h-3 text-primary shrink-0" />}
                              className="gap-1 bg-surface-inset shadow-inset border-border/40 whitespace-nowrap"
                            >
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No route assigned</span>
                      );
                    })()}
                  </td>

                  {/* Status & Work Session */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div>
                        {salesman.isActive ? (
                          <Badge variant="success" size="sm">ACTIVE</Badge>
                        ) : (
                          <Badge variant="neutral" styleType="outline" size="sm">INACTIVE</Badge>
                        )}
                      </div>
                      
                      {/* Work Session Indicator */}
                      {(() => {
                        const ws = salesman.workSessions?.[0];
                        if (!salesman.isActive) {
                          return (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Activity className="w-3 h-3" /> Disabled
                            </span>
                          );
                        }
                        if (!ws) {
                          return (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Activity className="w-3 h-3" /> Not started today
                            </span>
                          );
                        }
                        if (ws.status === 'ACTIVE') {
                          const loginTime = ws.loginAt ? new Date(ws.loginAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '';
                          return (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active {loginTime ? `(since ${loginTime})` : ''}
                            </span>
                          );
                        }
                        if (ws.status === 'COMPLETED') {
                          const logoutTime = ws.logoutAt ? new Date(ws.logoutAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '';
                          return (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                              Logged out {logoutTime ? `at ${logoutTime}` : ''}
                            </span>
                          );
                        }
                        if (ws.status === 'FORCE_CLOSED') {
                          const logoutTime = ws.logoutAt ? new Date(ws.logoutAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '';
                          return (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-500" />
                              Force Closed {logoutTime ? `at ${logoutTime}` : ''}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(salesman.id, salesman.isActive)}
                        disabled={togglingId === salesman.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-raised-sm press-active ${
                          salesman.isActive
                            ? 'text-destructive bg-surface-raised border border-destructive/20 hover:bg-destructive/10'
                            : 'text-emerald-600 dark:text-emerald-400 bg-surface-raised border border-emerald-500/20 hover:bg-emerald-500/10'
                        }`}
                      >
                        {togglingId === salesman.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {salesman.isActive ? 'Disabling...' : 'Activating...'}
                          </>
                        ) : salesman.isActive ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            Disable
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Activate
                          </>
                        )}
                      </button>

                      <Link
                        href={`/dashboard/admin/salesmen/${salesman.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-raised shadow-raised hover:shadow-raised-sm press-active text-primary border border-border/40 transition-all"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                        Manage
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSalesmen.length === 0 && (
          <div className="p-8">
            <EmptyState
              icon={<Search className="w-8 h-8 text-primary" />}
              title="No Salesmen Found"
              description="No salesmen match your current search query or status filter criteria."
              action={
                searchTerm || statusFilter !== 'ALL' || loginAccessFilter !== 'ALL' ? (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('ALL');
                      setLoginAccessFilter('ALL');
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Reset all filters
                  </button>
                ) : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

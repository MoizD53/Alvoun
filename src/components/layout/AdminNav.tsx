'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  Truck, 
  Box, 
  IndianRupee, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Menu, 
  X, 
  LogOut, 
  Bell, 
  History, 
  Factory, 
  Boxes, 
  Receipt, 
  Users2,
  ReceiptText 
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { ThemeToggle } from '@/components/theme-toggle';
import { normalizeRole, getRoleDisplayTitle } from '@/lib/rbac';

export default function AdminNav({ user }: { user: any }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = user?.role;
  const canonicalRole = normalizeRole(role);
  const roleTitle = getRoleDisplayTitle(role);

  const isActive = (href: string) => {
    if (href === '/dashboard/admin' && pathname !== '/dashboard/admin') return false;
    return pathname.startsWith(href);
  };

  // Build Role-Tailored Navigation for the 4 Dashboards:
  // 1. FOUNDER_CEO: Full access to all business, operations, and system administration modules
  // 2. DIRECTOR: Business oversight (Executive Dashboard, Sales, Customers, Dues, Reports, Operations view)
  // 3. OPERATIONS_STAFF: Combined Accountant & Production Staff (Sales, Ledgers, Dues, Expenses, Batches, Stock, Payroll)
  const isFounderCeo = canonicalRole === 'FOUNDER_CEO';
  const isDirector = canonicalRole === 'DIRECTOR';
  const isOperationsStaff = canonicalRole === 'OPERATIONS_STAFF';

  // MAIN SECTION ITEMS
  const mainItems = [
    ...(isFounderCeo || isDirector
      ? [{ name: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard }]
      : []),
    { name: 'Daily Sales', href: '/dashboard/admin/reports/daily', icon: IndianRupee },
    { name: 'Admin Entry', href: '/dashboard/admin/entry', icon: ReceiptText },
    { name: 'Customers', href: '/dashboard/admin/customers', icon: Users },
    ...(isFounderCeo
      ? [
          { name: 'Salesmen', href: '/dashboard/admin/salesmen', icon: Users },
          { name: 'Work Sessions', href: '/dashboard/admin/sessions', icon: Truck },
          { name: 'Locations', href: '/dashboard/admin/locations', icon: MapPin },
        ]
      : []),
    { name: 'Dues & Receivables', href: '/dashboard/admin/reports/outstanding', icon: CreditCard },
    { name: 'Analytics Reports', href: '/dashboard/admin/reports/monthly', icon: BarChart3 },
  ];

  // OPERATIONS & FACTORY ITEMS
  const operationsItems = [
    { name: 'Production Batches', href: '/dashboard/admin/production', icon: Factory },
    { name: 'Stock & Inventory', href: '/dashboard/admin/stock', icon: Boxes },
    { name: 'Company Expenses', href: '/dashboard/admin/expenses', icon: Receipt },
    ...(isFounderCeo || isDirector || isOperationsStaff
      ? [{ name: 'Staff & Payroll', href: '/dashboard/admin/payroll', icon: Users2 }]
      : []),
  ];

  // MASTER DATA ITEMS
  const masterDataItems = [
    ...(isFounderCeo || isDirector
      ? [{ name: 'Routes & Areas', href: '/dashboard/admin/routes', icon: MapPin }]
      : []),
    { name: 'Products & Rates', href: '/dashboard/admin/reports/products', icon: Box },
  ];

  // SYSTEM ADMINISTRATION ITEMS (Restricted to Founder & CEO / System Admin)
  const systemItems = [
    ...(isFounderCeo
      ? [
          { name: 'System Settings', href: '/dashboard/admin/settings', icon: Settings },
          { name: 'Activity Log', href: '/dashboard/admin/activity', icon: History },
        ]
      : isDirector
      ? [{ name: 'Activity Log', href: '/dashboard/admin/activity', icon: History }]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#35291F]/40 dark:bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Neumorphic Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-surface-sidebar border-r border-border-default shadow-xs transform transition-transform duration-200 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header — Two Distinct, Separated, Large Logos */}
        <div className="h-20 flex items-center justify-between px-4 sm:px-5 border-b border-border-default/80 bg-surface-sidebar shrink-0">
          <Link href="/dashboard/admin" className="flex items-center gap-3.5 group min-w-0 flex-1 select-none">
            {/* Left Symbol: 'A' Inside Clean Circle */}
            <div className="relative h-12 w-12 sm:h-13 sm:w-13 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-180 drop-shadow-xs">
              <Image 
                src="/alvoun-emblem.png" 
                alt="Alvoun Emblem" 
                width={56} 
                height={56} 
                className="w-full h-full object-contain" 
                priority 
              />
            </div>
            {/* Right Wordmark: ALVOUN */}
            <div className="flex-1 min-w-0 flex items-center pl-0.5">
              <Image
                src="/alvoun-wordmark.png"
                alt="Alvoun"
                width={170}
                height={52}
                className="h-11 sm:h-12 w-auto object-contain max-w-[155px] group-hover:scale-[1.02] transition-transform duration-180"
                priority
              />
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-secondary hover:text-primary hover:bg-surface-inset transition-colors cursor-pointer min-touch flex items-center justify-center"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {/* Main Section */}
          <div>
            <div className="px-3 text-[11px] font-extrabold text-secondary uppercase tracking-[0.15em] mb-2 select-none">
              Main
            </div>
            <nav className="space-y-1">
              {mainItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      group relative flex items-center px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 select-none min-touch
                      ${active 
                        ? 'bg-surface-inset text-teal-800 dark:text-teal-300 shadow-inset border border-border-default font-extrabold' 
                        : 'text-secondary hover:text-primary hover:bg-surface-inset/60 border border-transparent'
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1.5 rounded-full bg-teal-500 shadow-xs" />
                    )}
                    <item.icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${active ? 'text-teal-600 dark:text-teal-400 pl-1' : 'text-secondary group-hover:text-primary'}`} strokeWidth={2} />
                    <span className={active ? 'ml-2.5 font-extrabold tracking-tight' : 'ml-3'}>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Operations & Factory Section */}
          {operationsItems.length > 0 && (
            <div>
              <div className="px-3 text-[11px] font-extrabold text-secondary uppercase tracking-[0.15em] mb-2 select-none">
                Operations & Factory
              </div>
              <nav className="space-y-1">
                {operationsItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        group relative flex items-center px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 select-none min-touch
                        ${active 
                          ? 'bg-surface-inset text-teal-800 dark:text-teal-300 shadow-inset border border-border-default font-extrabold' 
                          : 'text-secondary hover:text-primary hover:bg-surface-inset/60 border border-transparent'
                        }
                      `}
                    >
                      {active && (
                        <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1.5 rounded-full bg-teal-500 shadow-xs" />
                      )}
                      <item.icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${active ? 'text-teal-600 dark:text-teal-400 pl-1' : 'text-secondary group-hover:text-primary'}`} strokeWidth={2} />
                      <span className={active ? 'ml-2.5 font-extrabold tracking-tight' : 'ml-3'}>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Master Data Section */}
          {masterDataItems.length > 0 && (
            <div>
              <div className="px-3 text-[11px] font-extrabold text-secondary uppercase tracking-[0.15em] mb-2 select-none">
                Master Data
              </div>
              <nav className="space-y-1">
                {masterDataItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        group relative flex items-center px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 select-none min-touch
                        ${active 
                          ? 'bg-surface-inset text-teal-800 dark:text-teal-300 shadow-inset border border-border-default font-extrabold' 
                          : 'text-secondary hover:text-primary hover:bg-surface-inset/60 border border-transparent'
                        }
                      `}
                    >
                      {active && (
                        <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1.5 rounded-full bg-teal-500 shadow-xs" />
                      )}
                      <item.icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${active ? 'text-teal-600 dark:text-teal-400 pl-1' : 'text-secondary group-hover:text-primary'}`} strokeWidth={2} />
                      <span className={active ? 'ml-2.5 font-extrabold tracking-tight' : 'ml-3'}>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          {/* System Admin Section (Founder & CEO / System Admin only) */}
          {systemItems.length > 0 && (
            <div>
              <div className="px-3 text-[11px] font-extrabold text-secondary uppercase tracking-[0.15em] mb-2 select-none">
                System Administration
              </div>
              <nav className="space-y-1">
                {systemItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        group relative flex items-center px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 select-none min-touch
                        ${active 
                          ? 'bg-surface-inset text-teal-800 dark:text-teal-300 shadow-inset border border-border-default font-extrabold' 
                          : 'text-secondary hover:text-primary hover:bg-surface-inset/60 border border-transparent'
                        }
                      `}
                    >
                      {active && (
                        <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1.5 rounded-full bg-teal-500 shadow-xs" />
                      )}
                      <item.icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${active ? 'text-teal-600 dark:text-teal-400 pl-1' : 'text-secondary group-hover:text-primary'}`} strokeWidth={2} />
                      <span className={active ? 'ml-2.5 font-extrabold tracking-tight' : 'ml-3'}>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </aside>

      {/* Top Header for Mobile Screen */}
      <header className="lg:hidden h-16 bg-surface-sidebar/95 backdrop-blur-md border-b border-border-default sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 w-full shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-inset transition-colors cursor-pointer min-touch flex items-center justify-center"
            aria-label="Open sidebar navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 select-none">
            {/* Left Symbol: 'A' Inside Clean Circle */}
            <div className="relative h-10 w-10 shrink-0 flex items-center justify-center drop-shadow-xs">
              <Image 
                src="/alvoun-emblem.png" 
                alt="Alvoun Emblem" 
                width={44} 
                height={44} 
                className="w-full h-full object-contain" 
                priority 
              />
            </div>
            {/* Right Wordmark: ALVOUN */}
            <Image
              src="/alvoun-wordmark.png"
              alt="Alvoun"
              width={145}
              height={44}
              className="h-9 sm:h-10 w-auto object-contain max-w-[140px]"
              priority
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button 
            type="button"
            onClick={() => signOut()}
            className="p-2 rounded-xl text-secondary hover:text-danger hover:bg-surface-inset transition-colors cursor-pointer min-touch flex items-center justify-center"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>
    </>
  );
}

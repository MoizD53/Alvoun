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
  DollarSign, 
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
  Users2
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const mainItems = [
  { name: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { name: 'Sales', href: '/dashboard/admin/reports/daily', icon: DollarSign },
  { name: 'Customers', href: '/dashboard/admin/customers', icon: Users },
  { name: 'Salesmen', href: '/dashboard/admin/salesmen', icon: Users },
  { name: 'Work Sessions', href: '/dashboard/admin/sessions', icon: Truck },
  { name: 'Locations', href: '/dashboard/admin/locations', icon: MapPin },
  { name: 'Dues', href: '/dashboard/admin/reports/outstanding', icon: CreditCard },
  { name: 'Reports', href: '/dashboard/admin/reports/monthly', icon: BarChart3 },
];

const operationsItems = [
  { name: 'Production Batches', href: '/dashboard/admin/production', icon: Factory },
  { name: 'Stock & Inventory', href: '/dashboard/admin/stock', icon: Boxes },
  { name: 'Company Expenses', href: '/dashboard/admin/expenses', icon: Receipt },
  { name: 'Staff & Payroll', href: '/dashboard/admin/payroll', icon: Users2 },
];

const masterDataItems = [
  { name: 'Routes & Areas', href: '/dashboard/admin/routes', icon: MapPin },
  { name: 'Products & Rates', href: '/dashboard/admin/reports/products', icon: Box },
];

const systemItems = [
  { name: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
  { name: 'Activity Log', href: '/dashboard/admin/activity', icon: History },
];

export default function AdminNav({ user }: { user: any }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard/admin' && pathname !== '/dashboard/admin') return false;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#2C2015]/40 dark:bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Neumorphic Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-surface-sidebar border-r border-border-default shadow-xs transform transition-transform duration-200 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo & Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border-default bg-surface-sidebar">
          <Link href="/dashboard/admin" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 rounded-full overflow-hidden shrink-0 border border-border-default/80 shadow-xs flex items-center justify-center transition-transform group-hover:scale-105 duration-200 bg-white">
              <Image 
                src="/icons/icon.png" 
                alt="ALVOUN" 
                width={40} 
                height={40} 
                className="w-full h-full object-cover scale-110 rounded-full" 
                priority 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-primary leading-none">
                ALVOUN
              </span>
              <span className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mt-0.5">
                Operations
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Badge variant="teal" styleType="subtle" size="sm" className="hidden sm:inline-flex">
              Admin
            </Badge>
            <button 
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-inset transition-colors cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {/* Main Section */}
          <div>
            <div className="px-3 text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2 select-none">
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
                      group relative flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 select-none
                      ${active 
                        ? 'bg-surface-inset text-teal-800 dark:text-teal-300 shadow-inset border border-border-default font-bold' 
                        : 'text-secondary hover:text-primary hover:bg-surface-inset/60 border border-transparent'
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-teal-500 shadow-xs" />
                    )}
                    <item.icon className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-teal-600 dark:text-teal-400 pl-1' : 'text-muted group-hover:text-primary'}`} strokeWidth={2} />
                    <span className={active ? 'ml-2.5 font-bold tracking-tight' : 'ml-3'}>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Operations & Factory Section */}
          <div>
            <div className="px-3 text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2 select-none">
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
                      group relative flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 select-none
                      ${active 
                        ? 'bg-surface-inset text-teal-800 dark:text-teal-300 shadow-inset border border-border-default font-bold' 
                        : 'text-secondary hover:text-primary hover:bg-surface-inset/60 border border-transparent'
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-teal-500 shadow-xs" />
                    )}
                    <item.icon className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-teal-600 dark:text-teal-400 pl-1' : 'text-muted group-hover:text-primary'}`} strokeWidth={2} />
                    <span className={active ? 'ml-2.5 font-bold tracking-tight' : 'ml-3'}>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Master Data Section */}
          <div>
            <div className="px-3 text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2 select-none">
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
                      group relative flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 select-none
                      ${active 
                        ? 'bg-surface-inset text-teal-800 dark:text-teal-300 shadow-inset border border-border-default font-bold' 
                        : 'text-secondary hover:text-primary hover:bg-surface-inset/60 border border-transparent'
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-teal-500 shadow-xs" />
                    )}
                    <item.icon className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-teal-600 dark:text-teal-400 pl-1' : 'text-muted group-hover:text-primary'}`} strokeWidth={2} />
                    <span className={active ? 'ml-2.5 font-bold tracking-tight' : 'ml-3'}>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* System Section */}
          <div>
            <div className="px-3 text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2 select-none">
              System
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
                      group relative flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 select-none
                      ${active 
                        ? 'bg-surface-inset text-teal-800 dark:text-teal-300 shadow-inset border border-border-default font-bold' 
                        : 'text-secondary hover:text-primary hover:bg-surface-inset/60 border border-transparent'
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-teal-500 shadow-xs" />
                    )}
                    <item.icon className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-teal-600 dark:text-teal-400 pl-1' : 'text-muted group-hover:text-primary'}`} strokeWidth={2} />
                    <span className={active ? 'ml-2.5 font-bold tracking-tight' : 'ml-3'}>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom User Profile Well */}
        <div className="p-3 border-t border-border-default bg-surface-sidebar">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-surface-inset border border-border-default shadow-inset">
            <Avatar 
              size="sm" 
              fallback={user?.name?.charAt(0) || 'A'} 
              status="online" 
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-primary truncate leading-tight">
                {user?.name || 'Administrator'}
              </p>
              <p className="text-[10px] font-medium text-secondary truncate uppercase tracking-wider mt-0.5">
                {user?.role || 'Admin'}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle />
              <button 
                type="button"
                onClick={() => signOut()}
                className="inline-flex items-center justify-center rounded-xl w-8 h-8 border border-border-default bg-surface-raised shadow-xs hover:border-danger/40 text-muted hover:text-danger transition-all cursor-pointer press-active"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Top Header for Mobile Screen */}
      <header className="lg:hidden h-16 bg-surface-sidebar/95 backdrop-blur-md border-b border-border-default sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 w-full shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-inset transition-colors cursor-pointer"
            aria-label="Open sidebar navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0 border border-border-default/80 shadow-xs flex items-center justify-center bg-white">
              <Image 
                src="/icons/icon.png" 
                alt="ALVOUN" 
                width={32} 
                height={32} 
                className="w-full h-full object-cover scale-110 rounded-full" 
                priority 
              />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-primary">ALVOUN</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button 
            type="button"
            className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-inset relative transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-teal-500 shadow-xs" />
          </button>
        </div>
      </header>
    </>
  );
}

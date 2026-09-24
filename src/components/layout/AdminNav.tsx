'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  Droplet,
  Bell
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
  { name: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { name: 'Sales', href: '/dashboard/admin/reports/daily', icon: DollarSign },
  { name: 'Customers', href: '/dashboard/admin/customers', icon: Users },
  { name: 'Salesmen Access', href: '/dashboard/admin/salesmen-access', icon: Truck },
  { name: 'Work Sessions', href: '/dashboard/admin/sessions', icon: Truck },
  { name: 'Locations', href: '/dashboard/admin/locations', icon: MapPin },
  { name: 'Dues', href: '/dashboard/admin/reports/outstanding', icon: CreditCard },
  { name: 'Reports', href: '/dashboard/admin/reports/monthly', icon: BarChart3 },
];

const masterDataItems = [
  { name: 'Routes', href: '/dashboard/admin/routes', icon: MapPin },
  { name: 'Products', href: '/dashboard/admin/reports/products', icon: Box },
  { name: 'Settings', href: '/dashboard/admin/states', icon: Settings },
  { name: 'Salesmen Accounts', href: '/dashboard/admin/salesmen', icon: Users },
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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <Link href="/dashboard/admin" className="flex items-center text-alvoun-blue">
            <Droplet className="h-7 w-7 fill-current" />
            <span className="ml-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">ALVOUN</span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600 dark:text-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${active 
                    ? 'bg-alvoun-light dark:bg-alvoun-blue/20 text-alvoun-blue dark:text-alvoun-blue' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100'
                  }
                `}
              >
                <item.icon className={`mr-3 h-5 w-5 ${active ? 'text-alvoun-blue' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}

          <div className="pt-6 pb-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Master Data
          </div>
          
          {masterDataItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${active 
                    ? 'bg-alvoun-light dark:bg-alvoun-blue/20 text-alvoun-blue dark:text-alvoun-blue' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100'
                  }
                `}
              >
                <item.icon className={`mr-3 h-5 w-5 ${active ? 'text-alvoun-blue' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* User Info Bottom */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-alvoun-blue text-white flex items-center justify-center font-bold text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.role}</p>
            </div>
            <div className="flex items-center space-x-1">
              <ThemeToggle />
              <button 
                onClick={() => signOut()}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Top Header for Mobile & Search */}
      <header className="lg:hidden h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 w-full">
        <div className="flex items-center flex-1">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 mr-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 rounded-md"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center text-alvoun-blue">
            <Droplet className="h-6 w-6 fill-current" />
            <span className="ml-2 font-bold text-slate-900 dark:text-slate-100">ALVOUN</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-alvoun-red border-2 border-white dark:border-slate-950"></span>
          </button>
        </div>
      </header>
    </>
  );
}

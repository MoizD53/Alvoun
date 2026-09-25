'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'Daily Sales', href: '/dashboard/admin/reports/daily' },
  { name: 'Monthly Sales', href: '/dashboard/admin/reports/monthly' },
  { name: 'Dues', href: '/dashboard/admin/reports/outstanding' },
  { name: 'Products', href: '/dashboard/admin/reports/products' },
];

export default function ReportsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-alvoun-blue text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

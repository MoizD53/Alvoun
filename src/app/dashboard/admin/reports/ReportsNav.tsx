'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, TrendingUp, CreditCard, Package } from 'lucide-react';

const navItems = [
  { name: 'Daily Sales', href: '/dashboard/admin/reports/daily', icon: Calendar },
  { name: 'Monthly Sales', href: '/dashboard/admin/reports/monthly', icon: TrendingUp },
  { name: 'Dues', href: '/dashboard/admin/reports/outstanding', icon: CreditCard },
  { name: 'Products', href: '/dashboard/admin/reports/products', icon: Package },
];

export default function ReportsNav() {
  const pathname = usePathname();

  return (
    <nav className="inline-flex flex-wrap bg-surface-inset shadow-inset p-1 rounded-2xl border border-border/40 gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              isActive
                ? 'bg-surface-raised shadow-raised text-primary border border-border/40'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised/40'
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

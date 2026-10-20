'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ShoppingBag, User } from 'lucide-react';

const navItems = [
  { name: 'Home', href: '/dashboard/salesman', icon: Home, exact: true },
  { name: 'Customers', href: '/dashboard/salesman/customers', icon: Users, exact: false },
  { name: 'Sales', href: '/dashboard/salesman/sales', icon: ShoppingBag, exact: false },
  { name: 'Profile', href: '/dashboard/salesman/profile', icon: User, exact: false },
];

export default function SalesmanBottomNav() {
  const pathname = usePathname();

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 w-full bg-surface-raised/95 backdrop-blur-md border-t border-border/40 z-50 px-4 py-2 flex justify-around items-center pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact 
          ? pathname === item.href 
          : pathname === item.href || pathname.startsWith(item.href + '/');

        return (
          <Link 
            key={item.href} 
            href={item.href} 
            className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] px-3 py-1 rounded-xl transition-all ${
              isActive 
                ? 'text-primary font-bold' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className={`p-1 rounded-lg transition-all ${
              isActive ? 'bg-primary/10 shadow-inset' : ''
            }`}>
              <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-wide">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

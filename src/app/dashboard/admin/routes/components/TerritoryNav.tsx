'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Building2, Map } from 'lucide-react';

export default function TerritoryNav() {
  const pathname = usePathname();

  const tabs = [
    { href: '/dashboard/admin/routes', label: 'Routes & Areas', icon: MapPin },
    { href: '/dashboard/admin/cities', label: 'Cities', icon: Building2 },
    { href: '/dashboard/admin/states', label: 'States', icon: Map },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-surface-sunken shadow-inset rounded-2xl border border-border-subtle max-w-fit">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href || (tab.href === '/dashboard/admin/routes' && pathname.startsWith('/dashboard/admin/routes/'));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isActive
                ? 'bg-brand-teal text-white shadow-raised-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

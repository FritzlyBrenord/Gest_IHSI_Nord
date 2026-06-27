'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/superviseur/evenements/formations', label: 'Formations' },
  { href: '/superviseur/evenements/reunions', label: 'Reunions' },
];

export function EventsSubnav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

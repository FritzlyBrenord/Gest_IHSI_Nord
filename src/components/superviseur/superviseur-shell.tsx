'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3,
  CalendarRange,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  PenTool,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useSuperviseurDemo } from '@/components/superviseur/superviseur-provider';

const navItems = [
  { href: '/superviseur/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/superviseur/equipe', label: 'Equipe', icon: Users },
  { href: '/superviseur/taches', label: 'Taches recues', icon: CheckSquare },
  { href: '/superviseur/evenements', label: 'Evenements', icon: CalendarRange },
   { href: '/superviseur/documents', label: 'Documents', icon: BarChart3 },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const { superviseur } = useSuperviseurDemo();

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      onNavigate?.();
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
            <Image src="/logo.webp" alt="IHSI" fill className="object-contain p-2" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">IHSI</p>
            <h1 className="text-base font-semibold text-slate-950">Espace Superviseur</h1>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-950">{superviseur.prenom} {superviseur.nom}</p>
          <p className="text-xs text-slate-500">{superviseur.poste}</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-emerald-700')} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-slate-200 px-4 py-4">
        <Button variant="ghost" className="w-full justify-start rounded-xl text-slate-600 hover:bg-slate-100" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          {loggingOut ? 'Deconnexion...' : 'Deconnexion'}
        </Button>
      </div>
    </div>
  );
}

export function SuperviseurShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { superviseur } = useSuperviseurDemo();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <SidebarNav />
      </aside>

      <div className="lg:ml-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SheetTitle className="sr-only">Navigation superviseur</SheetTitle>
                  <SidebarNav />
                </SheetContent>
              </Sheet>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Superviseur</p>
                <h2 className="text-base font-semibold text-slate-950">{navItems.find((item) => pathname.startsWith(item.href))?.label || 'Espace'}</h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-950">{superviseur.prenom} {superviseur.nom}</p>
                <p className="text-xs text-slate-500">{superviseur.poste}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white shadow-sm">
                {superviseur.prenom.charAt(0)}{superviseur.nom.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

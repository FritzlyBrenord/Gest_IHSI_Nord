'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Users, UserCog, StarHalfIcon, ClipboardList, Calendar, LogOut, Menu } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { IHSILoader } from '@/components/ui/ihsi-loader';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hook/useAuth';

const mainNavItems = [
  { href: '/pilotage-administratif', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/employees', label: 'Employés', icon: Users },
  { href: '/users', label: 'Utilisateurs', icon: UserCog },
  { href: '/meetings', label: 'Événements', icon: Calendar },
  { href: '/objectives', label: 'Objectifs', icon: ClipboardList },
  {href: '/inventory', label: 'Intentaire', icon:StarHalfIcon },
  { href: '/documents', label: 'Documents', icon: ClipboardList },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, isSuperAdmin } = useAuth();

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut({ redirect: false });
    } finally {
      onNavigate?.();
      router.push('/login');
      router.refresh();
    }
  };

  const initials = (user?.name || user?.email || 'U')
    .split(' ')
    .map((part: string) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-5">
        <div className="flex h-32 w-32 items-center justify-center rounded-xl text-white">
          <img src="/logo.webp" alt="IHSI" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">IHSI</h1>
          <p className="text-xs text-muted-foreground">Institut Haitien de Statistique et d'informatique</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-emerald-600 dark:text-emerald-400')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4" />

        <button
          onClick={handleLogout}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
          {loggingOut ? 'Déconnexion...' : 'Déconnexion'}
        </button>
      </ScrollArea>

      <div className="border-t px-4 py-4 flex flex-col gap-2">
        {user ? (
          <Link href="/profile" onClick={onNavigate} className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <div className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2 transition-colors group-hover:bg-muted">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={user.photoUrl || undefined} alt={user.name || 'Profil'} />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                {isSuperAdmin ? (
                  <span className="truncate text-xs font-medium text-emerald-600 dark:text-emerald-400">Super Administrateur</span>
                ) : (
                  <span className="truncate text-xs text-muted-foreground">Cliquez pour ouvrir le profil</span>
                )}
              </div>
            </div>
          </Link>
        ) : null}
        <p className="mt-2 text-center text-xs text-muted-foreground">IHSI v1.0</p>
      </div>
    </div>
  );
}

export default function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return <IHSILoader />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed top-0 left-0 z-30 hidden h-screen w-64 border-r bg-card lg:flex lg:flex-col">
        <SidebarNav />
      </aside>

      <div className="flex flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-card px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl text-white">
              <img src="/logo.webp" alt="IHSI" />
            </div>
            <span className="text-sm font-bold">IHSI</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarNav />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardList, Home, LogOut, Menu, QrCode, X , PencilSparkles} from "lucide-react";
import { useAuth } from "@/hook/useAuth";

const navItems = [
  { href: '/home', label: 'Accueil', icon: Home },
  { href: '/evenements', label: 'Evenements', icon: BookOpen },
  { href: '/scan', label: 'Scan', icon: QrCode },
  { href: '/tache', label: 'Tâches', icon: ClipboardList },
 { href: '/executant/documents', label: 'Documents', icon: PencilSparkles},

];

function initials(name?: string | null) {
  return (name || 'Employé')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function EmployeLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, role } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function loadProfilePhoto() {
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (!res.ok) return;
        if (!cancelled) {
          setProfilePhoto(data?.profile?.photoUrl ?? null);
        }
      } catch {
        if (!cancelled) {
          setProfilePhoto(null);
        }
      }
    }

    void loadProfilePhoto();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (user?.photoUrl !== undefined) {
      setProfilePhoto(user.photoUrl ?? null);
    }
  }, [user?.photoUrl]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ redirect: false });
    router.replace('/login');
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">
        Vérification de la session...
      </div>
    );
  }

  const avatarSrc = profilePhoto || user?.photoUrl || undefined;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-slate-100 text-slate-950">
      <header className="sticky top-0 z-20 hidden border-b border-slate-200/60 bg-white/90 backdrop-blur-md lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-lg shadow-sm">
              <Image src="/logo.webp" alt="IHSI" fill className="object-contain" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#003087]">IHSI</p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    active ? 'bg-[#003087] text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-[#003087]'
                  }`}
                >
                  <Icon className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-white' : 'text-slate-400 group-hover:text-[#003087]'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleLogout} disabled={loggingOut} className="h-9 rounded-xl text-slate-600 hover:text-[#003087]">
              <LogOut className="mr-2 h-4 w-4" />
              {loggingOut ? 'Déconnexion...' : 'Déconnexion'}
            </Button>
            <Link
              href="/mon-profil"
              className="flex items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-slate-50"
            >
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{user?.name || 'Employé'}</p>
                <p className="text-[10px] font-medium text-slate-500">{role || 'Membre'}</p>
                  </div>
              <Avatar className="h-9 w-9 border border-slate-200 shadow-sm">
                <AvatarImage src={avatarSrc} alt={user?.name || 'Profil'} />
                <AvatarFallback className="bg-[#003087] text-xs font-bold text-white">{initials(user?.name)}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-lg shadow-sm">
              <Image src="/logo.webp" alt="IHSI" fill className="object-contain" />
            </div>
            <div>
              <Link href="/mon-profil" className="block">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#003087]">{role || 'Membre'}</p>
                <h1 className="text-sm font-bold text-slate-900">{user?.name || 'Employé'}</h1>
                <p className="text-[10px] font-medium text-slate-500">Ouvrir le profil</p>
              </Link>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="absolute inset-x-0 top-full border-b border-slate-200/60 bg-white/95 px-4 pb-4 pt-2 shadow-lg backdrop-blur-md">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      active ? 'bg-[#003087] text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-[#003087]'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 border-t border-slate-200 pt-3">
              <Link
                href="/mon-profil"
                onClick={() => setMobileMenuOpen(false)}
                className="mb-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-[#003087]"
              >
                <Avatar className="h-9 w-9 border border-slate-200 shadow-sm">
                  <AvatarImage src={avatarSrc} alt={user?.name || 'Profil'} />
                  <AvatarFallback className="bg-[#003087] text-xs font-bold text-white">{initials(user?.name)}</AvatarFallback>
                </Avatar>
                <span>Mon profil</span>
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-[#003087]"
              >
                <LogOut className="h-5 w-5" />
                <span>{loggingOut ? 'Déconnexion...' : 'Déconnexion'}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-5 pb-28 lg:pb-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/60 bg-white/95 px-3 py-2 shadow-[0_-8px_32px_rgba(15,23,42,0.08)] backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition-all duration-200 ${
                  active ? 'text-[#003087]' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-200 ${active ? 'scale-110 text-[#003087]' : ''}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}


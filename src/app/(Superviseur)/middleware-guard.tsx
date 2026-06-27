'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { IHSILoader } from '@/components/ui/ihsi-loader';
import { useAuth } from '@/hook/useAuth';

export function MiddlewareGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isSuperviseur, isSuperAdmin, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(pathname.startsWith('/superviseur') ? '/login' : '/');
      return;
    }

    if (!isSuperviseur && !isSuperAdmin) {
      router.replace('/');
      return;
    }
  }, [isLoading, isAuthenticated, isSuperviseur, isSuperAdmin, pathname, router]);

  if (isLoading || !isAuthenticated || (!isSuperviseur && !isSuperAdmin)) {
    return <IHSILoader />;
  }

  return <>{children}</>;
}

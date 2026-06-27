'use client';

import { MiddlewareGuard } from '@/app/(Superviseur)/middleware-guard';
import { SuperviseurProvider } from '@/components/superviseur/superviseur-provider';
import { SuperviseurShell } from '@/components/superviseur/superviseur-shell';

export function SuperviseurFrame({ children }: { children: React.ReactNode }) {
  return (
    <SuperviseurProvider>
      <MiddlewareGuard>
        <SuperviseurShell>{children}</SuperviseurShell>
      </MiddlewareGuard>
    </SuperviseurProvider>
  );
}

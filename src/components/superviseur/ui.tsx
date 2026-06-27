'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  MockSupervisorFormation,
  MockSupervisorMember,
  MockSupervisorReport,
  SupervisorReportStatus,
  SupervisorTaskPriority,
  SupervisorTaskStatus,
} from '@/lib/mock-superviseur';

export function getInitials(label: string) {
  return label
    .split(' ')
    .map((chunk) => chunk.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function StatusBadge({
  status,
}: {
  status: SupervisorTaskStatus | SupervisorReportStatus | MockSupervisorMember['statut'] | MockSupervisorFormation['statut'];
}) {
  const styles: Record<string, string> = {
    actif: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    inactif: 'bg-slate-200 text-slate-700 hover:bg-slate-200',
    a_faire: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
    en_cours: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
    termine: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    en_retard: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
    passee: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
    prevue: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
    en_attente: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
    valide: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    correction_demandee: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
    transmis_directeur: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
    signe_directeur: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  };

  const labels: Record<string, string> = {
    actif: 'Actif',
    inactif: 'Inactif',
    a_faire: 'A faire',
    en_cours: 'En cours',
    termine: 'Termine',
    en_retard: 'En retard',
    passee: 'Completee',
    prevue: 'A venir',
    en_attente: 'En attente',
    valide: 'Valide',
    correction_demandee: 'Correction demandee',
    transmis_directeur: 'Transmis au Directeur',
    signe_directeur: 'Signe par le Directeur',
  };

  return <Badge className={cn(styles[status] || 'bg-slate-100 text-slate-700 hover:bg-slate-100')}>{labels[status] || status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: SupervisorTaskPriority }) {
  const styles: Record<SupervisorTaskPriority, string> = {
    haute: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
    normale: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
    basse: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
  };
  const labels: Record<SupervisorTaskPriority, string> = {
    haute: 'Haute',
    normale: 'Normale',
    basse: 'Basse',
  };

  return <Badge className={styles[priority]}>{labels[priority]}</Badge>;
}

export function scoreTone(score: number | null) {
  if (score === null) return 'bg-slate-100 text-slate-600';
  if (score >= 85) return 'bg-emerald-100 text-emerald-700';
  if (score >= 65) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
        {icon}
      </div>
      <p className="mt-4 text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold text-slate-950">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

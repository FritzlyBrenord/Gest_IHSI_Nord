'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, BookOpen, ClipboardList, Users } from 'lucide-react';
import { useSuperviseurDemo } from '@/components/superviseur/superviseur-provider';
import { SectionCard, StatusBadge } from '@/components/superviseur/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getPeriodRange, isDateWithinRange, safePercent } from '@/lib/superviseur-statistics';

function formatLongDate() {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function SuperviseurDashboardPage() {
  const { superviseur, members, incomingTasks, memberTasks, objectiveTasks, objectiveReports, events } =
    useSuperviseurDemo();

  const activeMembers = members.filter((member) => member.statut === 'actif').length;
  const receivedInProgress = incomingTasks.filter((task) => task.statut === 'en_cours').length;
  const pendingReports = objectiveReports.length;
  const completionRate =
    memberTasks.length === 0
      ? 0
      : Math.round((memberTasks.filter((task) => task.statut === 'termine').length / memberTasks.length) * 100);
  const nextFormation =
    events
      .filter((event) => event.type === 'Formation' && new Date(event.date).getTime() >= Date.now())
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())[0] || null;
  const monthRange = getPeriodRange('mois');
  const monthIncomingTasks = incomingTasks.filter((task) => isDateWithinRange(task.dateDebut || task.dateFin, monthRange));
  const monthSharedTasks = memberTasks.filter((task) =>
    isDateWithinRange(task.dateDebut || task.dateFin || task.creeLe || task.createdAt || null, monthRange)
  );
  const monthObjectiveTasks = objectiveTasks.filter((task) => isDateWithinRange(task.meetingDate, monthRange));
  const monthCompleted = monthIncomingTasks.filter((task) => task.statut === 'termine').length +
    monthSharedTasks.filter((task) => task.statut === 'termine').length;
  const monthTotal = monthIncomingTasks.length + monthSharedTasks.length;
  const monthCompletionRate = safePercent(monthCompleted, monthTotal);
  const monthObjectiveRate = safePercent(monthObjectiveTasks.filter((task) => task.status === 'ATTEINT').length, monthObjectiveTasks.length);

  const stats = [
    {
      label: 'Membres actifs',
      value: activeMembers,
      caption: 'Equipe actuellement disponible',
      icon: Users,
      accent: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Taches recues en cours',
      value: receivedInProgress,
      caption: 'Demandes a piloter depuis la hierarchie',
      icon: ClipboardList,
      accent: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Rapports a valider',
      value: pendingReports,
      caption: 'Statuts et notes des membres',
      icon: BarChart3,
      accent: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Prochaine formation',
      value: nextFormation
        ? new Date(nextFormation.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
        : '--',
      caption: nextFormation?.titre || 'Aucune programmee',
      icon: BookOpen,
      accent: 'bg-violet-50 text-violet-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          Bonjour, {superviseur.prenom}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Tableau de bord Superviseur
        </h1>
        <p className="mt-2 text-sm text-slate-500">{formatLongDate()}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label} className="border-slate-200 bg-white shadow-sm">
            <CardContent className="flex items-start justify-between p-6">
              <div>
                <p className="text-sm font-medium text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{item.value}</p>
                <p className="mt-1 text-xs text-slate-500">{item.caption}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.accent}`}>
                <item.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Taches recues recentes"
          action={
            <Button asChild variant="ghost" className="text-emerald-700">
              <Link href="/superviseur/taches">
                Ouvrir
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
        >
          <div className="space-y-3">
            {incomingTasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-950">{task.titre}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {task.source} | {new Date(task.dateFin).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <StatusBadge status={task.statut} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Suivi de l equipe"
          action={
            <Button asChild variant="ghost" className="text-emerald-700">
              <Link href="/superviseur/equipe">
                Voir les membres
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Taches equipe terminees</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {memberTasks.filter((task) => task.statut === 'termine').length} sur {memberTasks.length}
                  </p>
                </div>
                <span className="text-lg font-semibold text-slate-950">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="mt-4 h-2.5" />
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Avancement du mois
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-900">{monthCompletionRate}%</p>
              <p className="mt-1 text-sm text-emerald-800">
                {monthCompleted} taches terminees sur {monthTotal} et {monthObjectiveRate}% d objectifs atteints
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

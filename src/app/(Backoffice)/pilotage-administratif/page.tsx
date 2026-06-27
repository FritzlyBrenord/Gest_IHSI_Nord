'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OBJECTIVE_STATUS_LABELS, type WeeklyObjectivePlan, type WeeklyObjectiveStatus } from '@/lib/weekly-objectives';
import { BookOpen, CalendarDays, Target, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchJsonOrThrow } from '@/lib/fetch-json';

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  position: string;
  department: string;
  hireDate?: string | null;
  photoUrl?: string | null;
  isActive: boolean;
  isAdmin: boolean;
  userRole?: string | null;
};

type MeetingCategory = 'REUNION' | 'FORMATION' | 'OBJECTIF_HEBDOMADAIRE' | string;
type MeetingStatus = 'A_VENIR' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE' | string;

type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  category: MeetingCategory;
  status: MeetingStatus;
  startAt: string;
  durationMins: number;
  location?: string | null;
  platform?: string | null;
  meetingUrl?: string | null;
  trainer?: string | null;
  type?: string;
  reportResponsible?: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    department: string;
  } | null;
  participants?: Array<{
    id: string;
    employeeId: string;
    wasPresent: boolean;
    attendanceMode?: string;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      position: string;
    };
  }>;
  trainingDocuments?: Array<{ id: string }>;
  reports?: Array<{
    id: string;
    title: string;
    workflowStatus: string;
    visibility: string;
    createdAt: string;
    updatedAt: string;
    reviewComment?: string | null;
    employer?: {
      firstName: string;
      lastName: string;
    };
  }>;
};

type Objective = {
  id: string;
  title: string;
  description?: string | null;
  periodType: string;
  startDate: string;
  endDate: string;
  plans: WeeklyObjectivePlan[];
  inheritedFrom?: {
    id: string;
    title: string;
  } | null;
};

type DashboardStats = {
  activeEmployees: number;
  objectiveMeetings: number;
  objectivesThisWeek: number;
  upcomingTrainings: number;
  upcomingMeetings: number;
};

type DashboardDataState = {
  employeesAvailable: boolean;
  meetingsAvailable: boolean;
  message: string | null;
};

type DashboardHighlights = {
  latestWeeklyObjective: Objective | null;
  latestTraining: Meeting | null;
  latestMeeting: Meeting | null;
};

const OBJECTIVE_STATUS_ORDER: WeeklyObjectiveStatus[] = [
  'ATTEINT',
  'EN_COURS',
  'NON_COMMENCE',
  'BLOQUE',
  'REPORTE',
  'SANS_REPONSE',
];

const OBJECTIVE_STATUS_COLORS: Record<WeeklyObjectiveStatus, string> = {
  ATTEINT: '#059669',
  EN_COURS: '#f59e0b',
  NON_COMMENCE: '#64748b',
  BLOQUE: '#dc2626',
  REPORTE: '#7c3aed',
  SANS_REPONSE: '#0891b2',
};

const EVENT_COLORS = {
  formations: '#0f766e',
  reunions: '#d97706',
};

function formatFullDate(value?: string | null) {
  if (!value) return 'Date non définie';
  return new Date(value).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Date non définie';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('fr-FR', { month: 'short' });
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + diff);
  return next;
}

function endOfWeek(date: Date) {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getCurrentWeekObjectiveCount(objective: Objective, now: Date) {
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  return objective.plans.reduce((total, plan) => {
    const planStart = new Date(`${plan.startsAt}T00:00:00`);
    const planEnd = new Date(`${plan.endsAt}T23:59:59`);
    const overlapsCurrentWeek = planEnd >= weekStart && planStart <= weekEnd;

    if (!overlapsCurrentWeek) return total;

    return total + plan.tasks.filter((task: any) => task.title.trim()).length;
  }, 0);
}

function summarizeObjectiveStatuses(objectives: Objective[], now: Date) {
  const summary = new Map<WeeklyObjectiveStatus, number>();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  for (const objective of objectives) {
    for (const plan of objective.plans) {
      const planStart = new Date(`${plan.startsAt}T00:00:00`);
      const planEnd = new Date(`${plan.endsAt}T23:59:59`);
      if (planEnd < weekStart || planStart > weekEnd) continue;

      for (const task of plan.tasks) {
        if (!task.title.trim()) continue;
        const key = task.status as WeeklyObjectiveStatus;
        summary.set(key, (summary.get(key) || 0) + 1);
      }
    }
  }

  return OBJECTIVE_STATUS_ORDER
    .map((status) => ({
      name: OBJECTIVE_STATUS_LABELS[status],
      value: summary.get(status) || 0,
      color: OBJECTIVE_STATUS_COLORS[status],
    }))
    .filter((item) => item.value > 0);
}

function buildEventTrendData(meetings: Meeting[], now: Date) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    return {
      key,
      name: monthLabel(date),
      formations: 0,
      reunions: 0,
    };
  });

  const monthMap = new Map(months.map((month) => [month.key, month]));

  for (const meeting of meetings) {
    const date = new Date(meeting.startAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const entry = monthMap.get(key);
    if (!entry) continue;

    if (meeting.category === 'FORMATION') entry.formations += 1;
    if (meeting.category === 'REUNION') entry.reunions += 1;
  }

  return months;
}

function findCurrentWeekObjective(objectives: Objective[], now: Date) {
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const currentWeekObjectives = objectives
    .filter((objective) =>
      objective.plans.some((plan) => {
        const planStart = new Date(`${plan.startsAt}T00:00:00`);
        const planEnd = new Date(`${plan.endsAt}T23:59:59`);
        return planEnd >= weekStart && planStart <= weekEnd;
      })
    )
    .sort((left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime());

  return currentWeekObjectives[0] || objectives[0] || null;
}

function findNearestUpcomingMeeting(meetings: Meeting[], category: MeetingCategory, now: Date) {
  return meetings
    .filter((meeting) => meeting.category === category && meeting.status !== 'ANNULEE')
    .sort((left, right) => {
      const leftTime = new Date(left.startAt).getTime();
      const rightTime = new Date(right.startAt).getTime();
      const leftDelta = leftTime >= now.getTime() ? leftTime - now.getTime() : Number.MAX_SAFE_INTEGER;
      const rightDelta = rightTime >= now.getTime() ? rightTime - now.getTime() : Number.MAX_SAFE_INTEGER;
      return leftDelta - rightDelta || rightTime - leftTime;
    })[0] || null;
}

function getStatusBadgeVariant(status?: string) {
  if (status === 'EN_COURS') return 'default';
  if (status === 'TERMINEE') return 'secondary';
  if (status === 'ANNULEE') return 'destructive';
  return 'outline';
}

function EventHighlightCard({
  title,
  icon: Icon,
  item,
  emptyLabel,
  accentClassName,
  extra,
  isObjective = false,
}: {
  title: string;
  icon: typeof Target;
  item: Meeting | Objective | null;
  emptyLabel: string;
  accentClassName: string;
  extra?: string | null;
  isObjective?: boolean;
}) {
  return (
    <Card className="border-slate-200/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentClassName}`}>
            <Icon className="h-4 w-4" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {item ? (
          <>
            <div>
              <p className="text-sm font-semibold text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {isObjective 
                  ? `${formatDateTime('startDate' in item ? item.startDate : '')} - ${formatDateTime('endDate' in item ? item.endDate : '')}`
                  : formatDateTime('startAt' in item ? item.startAt : '')
                }
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isObjective ? (
                <Badge variant="secondary">{('periodType' in item ? item.periodType : '')}</Badge>
              ) : (
                <Badge variant={getStatusBadgeVariant('status' in item ? item.status : undefined)}>
                  {'status' in item ? item.status.replaceAll('_', ' ') : ''}
                </Badge>
              )}
              {extra ? <Badge variant="secondary">{extra}</Badge> : null}
            </div>
            {'description' in item && item.description ? (
              <p className="line-clamp-2 text-sm text-slate-600">{item.description}</p>
            ) : null}
          </>
        ) : (
          <p className="py-6 text-sm text-slate-500">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [objectiveStatusData, setObjectiveStatusData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [eventTrendData, setEventTrendData] = useState<Array<{ name: string; formations: number; reunions: number }>>([]);
  const [highlights, setHighlights] = useState<DashboardHighlights>({
    latestWeeklyObjective: null,
    latestTraining: null,
    latestMeeting: null,
  });
  const [dataState, setDataState] = useState<DashboardDataState>({
    employeesAvailable: false,
    meetingsAvailable: false,
    message: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [employeesResult, meetingsResult, objectivesResult] = await Promise.allSettled([
          fetchJsonOrThrow<{ employees?: Employee[] }>('/api/employees?limit=1000'),
          fetchJsonOrThrow<{ meetings?: Meeting[] }>('/api/meetings'),
          fetchJsonOrThrow<{ objectives?: Objective[] }>('/api/objectives'),
        ]);

        const employeesJson = employeesResult.status === 'fulfilled' ? employeesResult.value : null;
        const meetingsJson = meetingsResult.status === 'fulfilled' ? meetingsResult.value : null;
        const objectivesJson = objectivesResult.status === 'fulfilled' ? objectivesResult.value : null;
        const employeesAvailable = employeesResult.status === 'fulfilled';
        const meetingsAvailable = meetingsResult.status === 'fulfilled';
        const objectivesAvailable = objectivesResult.status === 'fulfilled';
        const employees: Employee[] = employeesJson?.employees || [];
        const meetings: Meeting[] = meetingsJson?.meetings || [];
        const objectives: Objective[] = objectivesJson?.objectives || [];
        const now = new Date();

        const activeEmployees = employees.filter((employee) => employee.isActive).length;
        const currentWeekObjective = findCurrentWeekObjective(objectives, now);
        const latestTraining = findNearestUpcomingMeeting(meetings, 'FORMATION', now);
        const latestMeeting = findNearestUpcomingMeeting(meetings, 'REUNION', now);
        const objectivesThisWeek = objectives.reduce(
          (total, objective) => total + getCurrentWeekObjectiveCount(objective, now),
          0
        );
        const upcomingTrainings = meetings.filter(
          (meeting) => meeting.category === 'FORMATION' && meeting.status !== 'ANNULEE' && meeting.status !== 'TERMINEE'
        ).length;
        const upcomingMeetings = meetings.filter(
          (meeting) => meeting.category === 'REUNION' && meeting.status !== 'ANNULEE' && meeting.status !== 'TERMINEE'
        ).length;

        setStats({
          activeEmployees,
          objectiveMeetings: objectives.length,
          objectivesThisWeek,
          upcomingTrainings,
          upcomingMeetings,
        });
        setHighlights({
          latestWeeklyObjective: currentWeekObjective,
          latestTraining,
          latestMeeting,
        });
        setObjectiveStatusData(summarizeObjectiveStatuses(objectives, now));
        setEventTrendData(buildEventTrendData(meetings, now));
        const failedReasons = [employeesResult, meetingsResult, objectivesResult]
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason || '')))
          .filter(Boolean);
        setDataState({
          employeesAvailable,
          meetingsAvailable,
          message: failedReasons[0] || null,
        });
      } catch (error) {
        console.error('[admin-dashboard] fetch failed', error);
        setDataState({
          employeesAvailable: false,
          meetingsAvailable: false,
          message: error instanceof Error ? error.message : 'Impossible de charger les données du tableau de bord.',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const statCards = useMemo(() => ([
    {
      title: 'Employés actifs',
      value: stats?.activeEmployees ?? 0,
      subtitle: 'Base active',
      icon: Users,
      accentClassName: 'bg-emerald-50 text-emerald-700',
      available: dataState.employeesAvailable,
    },
    {
      title: 'Objectifs hebdomadaires',
      value: stats?.objectiveMeetings ?? 0,
      subtitle: `${stats?.objectivesThisWeek ?? 0} objectif(s) sur la semaine`,
      icon: Target,
      accentClassName: 'bg-amber-50 text-amber-700',
      available: dataState.meetingsAvailable,
    },
    {
      title: 'Formations prévues',
      value: stats?.upcomingTrainings ?? 0,
      subtitle: 'Événements à venir',
      icon: BookOpen,
      accentClassName: 'bg-teal-50 text-teal-700',
      available: dataState.meetingsAvailable,
    },
    {
      title: 'Réunions prévues',
      value: stats?.upcomingMeetings ?? 0,
      subtitle: 'Événements à venir',
      icon: CalendarDays,
      accentClassName: 'bg-orange-50 text-orange-700',
      available: dataState.meetingsAvailable,
    },
  ]), [stats, dataState.employeesAvailable, dataState.meetingsAvailable]);

  const currentWeekObjectiveCount = useMemo(
    () => highlights.latestWeeklyObjective ? getCurrentWeekObjectiveCount(highlights.latestWeeklyObjective, new Date()) : 0,
    [highlights.latestWeeklyObjective]
  );

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-52 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.15fr_1.85fr]">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {dataState.message ? (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-900">
              Service de base de données indisponible. Les données ne peuvent pas être chargées pour le moment.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Tableau de bord</h1>
          <p className="text-sm text-slate-500">
            Pilotage recentré sur les objectifs, les formations et les réunions.
          </p>
        </div>
        <p className="text-sm text-slate-500">{formatFullDate(new Date().toISOString())}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="border-slate-200/80">
            <CardContent className="flex items-start justify-between p-6">
              <div>
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {card.available ? card.value : '—'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {card.available ? card.subtitle : 'Données indisponibles'}
                </p>
              </div>
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.accentClassName}`}>
                <card.icon className="h-6 w-6" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <EventHighlightCard
          title="Objectif en cours cette semaine"
          icon={Target}
          item={highlights.latestWeeklyObjective}
          extra={currentWeekObjectiveCount > 0 ? `${currentWeekObjectiveCount} objectif(s)` : null}
          emptyLabel="Aucun objectif hebdomadaire trouvé pour la semaine en cours."
          accentClassName="bg-amber-50 text-amber-700"
          isObjective={true}
        />
        <EventHighlightCard
          title="Dernière formation prévue"
          icon={BookOpen}
          item={highlights.latestTraining}
          extra={highlights.latestTraining?.trainer ? `Formateur: ${highlights.latestTraining.trainer}` : null}
          emptyLabel="Aucune formation planifiée pour le moment."
          accentClassName="bg-teal-50 text-teal-700"
        />
        <EventHighlightCard
          title="Dernière réunion prévue"
          icon={CalendarDays}
          item={highlights.latestMeeting}
          extra={highlights.latestMeeting?.location || highlights.latestMeeting?.platform || null}
          emptyLabel="Aucune réunion planifiée pour le moment."
          accentClassName="bg-orange-50 text-orange-700"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1.85fr]">
        <Card className="border-slate-200/80">
          <CardHeader>
            <CardTitle className="text-base text-slate-950">Répartition des objectifs de la semaine</CardTitle>
          </CardHeader>
          <CardContent>
            {objectiveStatusData.length === 0 ? (
              <p className="flex h-70 items-center justify-center text-sm text-slate-500">
                Aucun objectif en cours sur cette semaine.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={objectiveStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {objectiveStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [`${value}`, name]} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {objectiveStatusData.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {objectiveStatusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-semibold text-slate-950">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80">
          <CardHeader>
            <CardTitle className="text-base text-slate-950">Tendance formations / réunions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={eventTrendData} barGap={10}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="formations" name="Formations" fill={EVENT_COLORS.formations} radius={[8, 8, 0, 0]} />
                <Bar dataKey="reunions" name="Réunions" fill={EVENT_COLORS.reunions} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

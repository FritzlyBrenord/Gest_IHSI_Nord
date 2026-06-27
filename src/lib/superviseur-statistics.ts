export type SupervisorStatsPeriod = 'mois' | 'trimestre' | 'semestre' | 'annee';

export type SupervisorStatusCount = {
  label: string;
  value: number;
  percent: number;
};

export type SupervisorPeriodRange = {
  label: string;
  start: Date;
  end: Date;
};

export type SupervisorStatsInput = {
  incomingTasks: Array<{
    statut: string;
    dateDebut: string;
    dateFin: string;
  }>;
  memberTasks: Array<{
    statut: string;
    dateDebut: string | null;
    dateFin: string | null;
    creeLe?: string;
    createdAt?: string;
    resultatValide?: boolean;
  }>;
  objectiveTasks: Array<{
    status: string;
    meetingDate: string;
    isEvaluated?: boolean;
  }>;
  objectiveReports: Array<{
    status: string;
    updatedAt: string;
  }>;
  referenceDate?: Date;
};

export function parseDateOnly(value?: string | null) {
  if (!value || !value.trim()) return null;
  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function safePercent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function getPeriodRange(period: SupervisorStatsPeriod, referenceDate = new Date()): SupervisorPeriodRange {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  if (period === 'trimestre') {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    const start = new Date(year, quarterStartMonth, 1, 0, 0, 0, 0);
    const end = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999);
    return {
      label: `T${Math.floor(month / 3) + 1} ${year}`,
      start,
      end,
    };
  }

  if (period === 'semestre') {
    const semesterStartMonth = month < 6 ? 0 : 6;
    const start = new Date(year, semesterStartMonth, 1, 0, 0, 0, 0);
    const end = new Date(year, semesterStartMonth + 6, 0, 23, 59, 59, 999);
    return {
      label: `${semesterStartMonth === 0 ? 'S1' : 'S2'} ${year}`,
      start,
      end,
    };
  }

  if (period === 'annee') {
    return {
      label: `Annee ${year}`,
      start: new Date(year, 0, 1, 0, 0, 0, 0),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  }

  return {
    label: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(referenceDate),
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

export function isDateWithinRange(value: string | null | undefined, range: SupervisorPeriodRange) {
  const parsed = parseDateOnly(value);
  if (!parsed) return false;
  return parsed.getTime() >= range.start.getTime() && parsed.getTime() <= range.end.getTime();
}

export function buildStatusCounts(labels: Record<string, string>, values: string[]) {
  const total = values.length;
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(labels).map(([status, label]) => ({
    label,
    value: counts[status] || 0,
    percent: safePercent(counts[status] || 0, total),
  }));
}


export type WeeklyObjectiveStatus =
  | 'ATTEINT'
  | 'EN_COURS'
  | 'NON_COMMENCE'
  | 'BLOQUE'
  | 'REPORTE'
  | 'SANS_REPONSE';

export const OBJECTIVE_STATUS_LABELS: Record<WeeklyObjectiveStatus, string> = {
  ATTEINT: 'Atteint',
  EN_COURS: 'En cours',
  NON_COMMENCE: 'Non commencé',
  BLOQUE: 'Bloqué',
  REPORTE: 'Reporté',
  SANS_REPONSE: 'Sans réponse',
};

export type WeeklyObjective = {
  id: string;
  title: string;
  status: string;
};

export type WeeklyObjectivePlan = {
  id: string;
  startsAt: string;
  endsAt: string;
  objectives: WeeklyObjective[];
};

export function countWeeklyObjectives(plans: WeeklyObjectivePlan[]): number {
  if (!plans || !Array.isArray(plans)) return 0;
  return plans.reduce((count, plan) => count + (plan.objectives?.length || 0), 0);
}

export function summarizeWeeklyObjectives(plans: WeeklyObjectivePlan[]) {
  const summary = { total: 0, atteints: 0, enCours: 0, bloques: 0, sansReponse: 0 };
  if (!plans || !Array.isArray(plans)) return summary;
  
  plans.forEach((plan) => {
    if (!plan.objectives) return;
    plan.objectives.forEach((obj) => {
      summary.total++;
      if (obj.status === 'ATTEINT') summary.atteints++;
      else if (obj.status === 'EN_COURS') summary.enCours++;
      else if (obj.status === 'BLOQUE') summary.bloques++;
      else if (obj.status === 'SANS_REPONSE') summary.sansReponse++;
    });
  });
  return summary;
}

export function createDefaultWeeklyObjectivePlans(): WeeklyObjectivePlan[] {
  return [
    {
      id: crypto.randomUUID(),
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      objectives: [],
    },
  ];
}

export function buildNextObjectivePeriod(previousPlans: WeeklyObjectivePlan[]): WeeklyObjectivePlan {
  // Just create a blank new plan for the next period based on the last end date
  const lastPlan = previousPlans[previousPlans.length - 1];
  const startsAt = lastPlan && lastPlan.endsAt ? lastPlan.endsAt : new Date().toISOString();
  const endsAt = new Date(new Date(startsAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  return {
    id: crypto.randomUUID(),
    startsAt,
    endsAt,
    objectives: [],
  };
}

export function formatMonthLabel(monthKey: string): string {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  if (!year || !month) return monthKey;
  
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

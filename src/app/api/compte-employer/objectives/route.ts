import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.employerId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const employerId = session.user.employerId;

    const allObjectives = await prisma.objective.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const relevantObjectives = [];

    for (const obj of allObjectives) {
      const plans = obj.plans as any[];
      if (!Array.isArray(plans)) continue;

      const relevantPlans = [];

      for (const plan of plans) {
        if (!Array.isArray(plan.tasks)) continue;

        const relevantTasks = plan.tasks.filter((task: any) => {
          // Only show tasks assigned directly to the employee (personId === employerId)
          // Do NOT show team-assigned tasks
          if (task.personId === employerId) return true;
          return false;
        });

        if (relevantTasks.length > 0) {
          relevantPlans.push({
            id: plan.id,
            plan: plan.name || 'Plan sans nom',
            startsAt: obj.startDate.toISOString(),
            endsAt: obj.endDate.toISOString(),
            monthKey: obj.startDate.toISOString().slice(0, 7),
            objectives: relevantTasks.map((task: any) => ({
              id: task.id,
              title: task.title,
              status: task.status || 'A_VENIR',
              progressNote: task.progressNote || '',
              isEvaluated: obj.isEvaluated,
              targetGroupId: task.teamId || null,
              targetGroupName: null,
            }))
          });
        }
      }

      if (relevantPlans.length > 0) {
        relevantObjectives.push({
          id: obj.id,
          title: obj.title,
          description: obj.description,
          objectivePlans: relevantPlans,
          reports: [] // UI expects this but we handle note inline via progressNote
        });
      }
    }

    return NextResponse.json({ objectives: relevantObjectives });
  } catch (error) {
    console.error('Erreur GET /api/compte-employer/objectives:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

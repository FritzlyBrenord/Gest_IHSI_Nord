import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN' || session.user.employerId === 'super-admin-id';

    // Get teams supervised by current user
    const teams = await prisma.equipe.findMany({
      where: isSuperAdmin ? {} : { superviseurId: session.user.employerId },
      select: { id: true, name: true }
    });

    const teamIds = teams.map(t => t.id);
    const teamNames = new Map(teams.map(t => [t.id, t.name]));

    // Get objectives with tasks assigned to these teams
    const objectives = await prisma.objective.findMany({
      where: {
        plans: {
          some: {
            tasks: {
              some: {
                responsibleType: 'equipe',
                teamId: { in: teamIds }
              }
            }
          }
        }
      },
      include: {
        plans: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Generate objective reports from objectives
    const reports = objectives.flatMap(objective => {
      return objective.plans.flatMap(plan => {
        return plan.tasks
          .filter(task => task.responsibleType === 'equipe' && teamIds.has(task.teamId))
          .map(task => ({
            id: `${objective.id}:${plan.id}:${task.id}`,
            meetingId: objective.id,
            meetingTitle: objective.title,
            meetingDate: objective.startDate,
            objectiveId: objective.id,
            objectiveTitle: objective.title,
            planLabel: plan.name,
            status: task.status || 'a_faire',
            note: task.evaluationNote || null,
            targetGroupId: task.teamId,
            targetGroupName: teamNames.get(task.teamId) || null,
            updatedAt: objective.updatedAt,
            taskId: task.id,
            taskTitle: task.title,
            department: task.department || null,
            isEvaluated: task.hasBeenEvaluated || objective.isEvaluated || false
          }));
      });
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Erreur GET /api/superviseur/objective-reports:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

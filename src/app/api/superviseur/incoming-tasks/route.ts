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

    // Get objectives
    const objectives = await prisma.objective.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Flatten objectives into incoming tasks format
    const incomingTasks = objectives.flatMap(objective => {
      const plans = (objective.plans as any[]) || [];
      return plans.flatMap(plan => {
        const tasks = (plan.objectives || plan.tasks || []) as any[];
        return tasks
          .filter(task => task.responsibleType === 'equipe' && teamIds.includes(task.teamId))
          .map(task => ({
            id: `${objective.id}:${plan.id}:${task.id}`,
            teamId: task.teamId,
            teamName: teamNames.get(task.teamId) || 'Équipe inconnue',
            titre: task.title,
            description: objective.description || '',
            source: 'Hiérarchie',
            statut: task.status || 'a_faire',
            priorite: 'normale',
            dateDebut: objective.startDate,
            dateFin: objective.endDate,
            objectiveId: objective.id,
            objectiveTitle: objective.title,
            planId: plan.id,
            planName: plan.name || 'Plan',
            taskId: task.id,
            responsibleType: task.responsibleType,
            department: task.department || '',
            createdAt: objective.createdAt
          }));
      });
    });

    return NextResponse.json({ tasks: incomingTasks });
  } catch (error) {
    console.error('Erreur GET /api/superviseur/incoming-tasks:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendObjectiveAssignedToEmployee, sendObjectiveAssignedToSupervisor } from '@/lib/email';

const objectiveInclude = {
  inheritedFrom: {
    select: { id: true, title: true },
  },
  children: {
    select: { id: true, title: true, createdAt: true, isEvaluated: true },
  },
};

// ─── GET /api/objectives/[id] ──────────────────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const objective = await prisma.objective.findUnique({
      where: { id },
      include: objectiveInclude,
    });

    if (!objective) {
      return NextResponse.json({ error: 'Objectif introuvable' }, { status: 404 });
    }

    // Resolve person and team names
    const personIds = new Set<string>();
    const teamIds = new Set<string>();

    objective.plans?.forEach((plan: any) => {
      plan.tasks?.forEach((task: any) => {
        if (task.personId) personIds.add(task.personId);
        if (task.teamId) teamIds.add(task.teamId);
      });
    });

    const [employees, teams] = await Promise.all([
      personIds.size > 0
        ? prisma.employer.findMany({
            where: { id: { in: Array.from(personIds) } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [],
      teamIds.size > 0
        ? prisma.equipe.findMany({
            where: { id: { in: Array.from(teamIds) } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const employeeMap = new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]));
    const teamMap = new Map(teams.map((t) => [t.id, t.name]));

    // Add resolved names to tasks
    const formattedObjective = {
      ...objective,
      plans: objective.plans?.map((plan: any) => ({
        ...plan,
        tasks: plan.tasks?.map((task: any) => ({
          ...task,
          personName: task.personId ? employeeMap.get(task.personId) || null : null,
          teamName: task.teamId ? teamMap.get(task.teamId) || null : null,
        })),
      })),
    };

    return NextResponse.json({ objective: formattedObjective });
  } catch (error) {
    console.error('GET /api/objectives/[id] error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 });
  }
}

// ─── PUT /api/objectives/[id] ──────────────────────────────────────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      title,
      description,
      periodType,
      startDate,
      endDate,
      plans,
      isEvaluated,
    } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};

    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description?.trim() || null;

    if (periodType !== undefined) {
      const validPeriodTypes = ['hebdomadaire', 'mensuel', 'trimestriel', 'semestriel', 'annuel'];
      if (!validPeriodTypes.includes(periodType)) {
        return NextResponse.json({ error: 'Type de période invalide' }, { status: 400 });
      }
      data.periodType = periodType;
    }

    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);

    if (startDate !== undefined && endDate !== undefined) {
      if (new Date(endDate) < new Date(startDate)) {
        return NextResponse.json(
          { error: 'La date de fin doit être après la date de début' },
          { status: 400 }
        );
      }
    }

    if (plans !== undefined) {
      // Nettoyer les plans avant stockage
      data.plans = plans.map((plan: {
        id: string;
        name: string;
        tasks: {
          id: string;
          title: string;
          status: string;
          responsibleType: string;
          department: string;
          personId: string;
          teamId: string;
          adminNotes?: Array<{ note: string; createdAt: string }>;
        }[];
      }) => ({
        id: plan.id,
        name: plan.name?.trim() || 'Plan sans nom',
        tasks: plan.tasks
          .filter((t: any) => t.title?.trim())
          .map((task: any) => ({
            id: task.id,
            title: task.title.trim(),
            status: task.status || 'a_faire',
            responsibleType: task.responsibleType || '',
            department: task.department || '',
            personId: task.responsibleType === 'personne' ? (task.personId || null) : null,
            teamId: task.responsibleType === 'equipe' ? (task.teamId || null) : null,
            score: typeof task.score === 'number' ? task.score : 0,
            evaluationNote: task.evaluationNote || null,
            hasBeenEvaluated: Boolean(task.hasBeenEvaluated),
            adminNotes: task.adminNotes || [],
            employeeNotes: task.employeeNotes || [],
            progressNote: task.progressNote || null,
          })),
      })).filter((p: { tasks: unknown[] }) => p.tasks.length > 0);
    }

    if (isEvaluated !== undefined) {
      data.isEvaluated = isEvaluated;
      data.evaluatedAt = isEvaluated ? new Date() : null;
    }

    const objective = await prisma.objective.update({
      where: { id },
      data,
      include: objectiveInclude,
    });

    // ─── Notifications par e-mail (asynchrones) ───────────────────────────────
    try {
      if (data.plans) {
        const personIds = new Set<string>();
        const teamIds = new Set<string>();

        data.plans.forEach((plan: any) => {
          plan.tasks.forEach((task: any) => {
            if (task.personId) personIds.add(task.personId);
            if (task.teamId) teamIds.add(task.teamId);
          });
        });

        // Notifier les personnes
        if (personIds.size > 0) {
          const employees = await prisma.employer.findMany({
            where: { id: { in: Array.from(personIds) } },
            select: { email: true, firstName: true, lastName: true },
          });

          for (const emp of employees) {
            if (emp.email) {
              sendObjectiveAssignedToEmployee(emp.email, {
                title: objective.title,
                description: objective.description,
                assigneeName: `${emp.firstName} ${emp.lastName}`,
              }).catch(e => console.error('Mail error (employee):', e));
            }
          }
        }

        // Notifier les superviseurs d'équipes
        if (teamIds.size > 0) {
          const teams = await prisma.equipe.findMany({
            where: { id: { in: Array.from(teamIds) } },
            include: { superviseur: true },
          });

          for (const team of teams) {
            if (team.superviseur && team.superviseur.email) {
              sendObjectiveAssignedToSupervisor(team.superviseur.email, {
                title: objective.title,
                description: objective.description,
                supervisorName: `${team.superviseur.firstName} ${team.superviseur.lastName}`,
                teamName: team.name,
              }).catch(e => console.error('Mail error (supervisor):', e));
            }
          }
        }
      }
    } catch (mailError) {
      console.error("Erreur générale lors de la préparation des e-mails (edit):", mailError);
    }

    return NextResponse.json({ objective });
  } catch (error) {
    console.error('PUT /api/objectives/[id] error:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

// ─── DELETE /api/objectives/[id] ───────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Détacher les enfants avant suppression
    await prisma.objective.updateMany({
      where: { inheritedFromId: id },
      data: { inheritedFromId: null },
    });

    await prisma.objective.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/objectives/[id] error:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
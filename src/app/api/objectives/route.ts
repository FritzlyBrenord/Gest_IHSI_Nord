import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendObjectiveAssignedToEmployee, sendObjectiveAssignedToSupervisor } from '@/lib/email';

// ─── GET /api/objectives ───────────────────────────────────────────────────────
export async function GET() {
  try {
    const objectives = await prisma.objective.findMany({
      include: {
        inheritedFrom: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ objectives });
  } catch (error) {
    console.error('GET /api/objectives error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des objectifs' },
      { status: 500 }
    );
  }
}

// ─── POST /api/objectives ──────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      periodType,
      startDate,
      endDate,
      plans,
      inheritedFromId,
    } = body;

    // ─── Validation ───────────────────────────────────────────────────────────

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Le titre est obligatoire' },
        { status: 400 }
      );
    }

    const validPeriodTypes = ['hebdomadaire', 'mensuel', 'trimestriel', 'semestriel', 'annuel'];
    if (!periodType || !validPeriodTypes.includes(periodType)) {
      return NextResponse.json(
        { error: 'Type de période invalide' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Les dates de début et de fin sont obligatoires' },
        { status: 400 }
      );
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: 'La date de fin doit être après la date de début' },
        { status: 400 }
      );
    }

    if (!Array.isArray(plans) || plans.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un plan est obligatoire' },
        { status: 400 }
      );
    }

    // Vérifier qu'il y a au moins une tâche au total
    const totalTasks = plans.flatMap((p: { tasks: { title: string }[] }) =>
      p.tasks.filter((t) => t.title?.trim())
    ).length;

    if (totalTasks === 0) {
      return NextResponse.json(
        { error: 'Au moins une tâche est obligatoire' },
        { status: 400 }
      );
    }

    // ─── Nettoyage des plans avant stockage ───────────────────────────────────
    const cleanedPlans = plans.map((plan: {
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
      }[];
    }) => ({
      id: plan.id,
      name: plan.name?.trim() || 'Plan sans nom',
      tasks: plan.tasks
        .filter((t) => t.title?.trim())
        .map((task) => ({
          id: task.id,
          title: task.title.trim(),
          status: task.status || 'a_faire',
          responsibleType: task.responsibleType || '',
          department: task.department || '',
          personId: task.responsibleType === 'personne' ? (task.personId || null) : null,
          teamId: task.responsibleType === 'equipe' ? (task.teamId || null) : null,
        })),
    })).filter((p: { tasks: unknown[] }) => p.tasks.length > 0);

    // ─── Création en base ─────────────────────────────────────────────────────
    const objective = await prisma.objective.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        periodType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        plans: cleanedPlans,
        inheritedFromId: inheritedFromId || null,
      },
      include: {
        inheritedFrom: {
          select: { id: true, title: true },
        },
      },
    });

    // ─── Notifications par e-mail (asynchrones) ───────────────────────────────
    try {
      const personIds = new Set<string>();
      const teamIds = new Set<string>();

      cleanedPlans.forEach((plan: any) => {
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
    } catch (mailError) {
      console.error("Erreur générale lors de la préparation des e-mails:", mailError);
    }

    return NextResponse.json({ objective }, { status: 201 });
  } catch (error) {
    console.error('POST /api/objectives error:', error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'objectif" },
      { status: 500 }
    );
  }
}
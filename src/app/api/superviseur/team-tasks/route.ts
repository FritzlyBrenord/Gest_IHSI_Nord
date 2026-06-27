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

    // Get tasks for teams supervised by the current user
    const teams = await prisma.equipe.findMany({
      where: isSuperAdmin ? {} : { superviseurId: session.user.employerId },
      select: { id: true, name: true }
    });

    const teamIds = teams.map(t => t.id);

    const tasks = await prisma.teamTask.findMany({
      where: { teamId: { in: teamIds } },
      include: {
        assignedEmployee: true,
        notes: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedTasks = tasks.map(t => {
      const employeeStatusNotes = t.notes
        .filter(n => n.type === 'EMPLOYEE')
        .map(n => ({ status: n.status as any, note: n.note, createdAt: n.createdAt.toISOString() }));
      const supervisorNotes = t.notes
        .filter(n => n.type === 'SUPERVISOR')
        .map(n => ({ note: n.note, createdAt: n.createdAt.toISOString() }));

      return {
        id: t.id,
        teamId: t.teamId,
        assignedEmployeeId: t.assignedEmployeeId,
        createdByManagedUserId: t.createdByManagedUserId,
        title: t.title,
        description: t.description,
        dateDebut: t.dateDebut ? t.dateDebut.toISOString() : null,
        dateFin: t.dateFin ? t.dateFin.toISOString() : null,
        priority: t.priority,
        status: t.status,
        employeeNote: t.employeeNote,
        employeeStatusNotes,
        supervisorNote: t.supervisorNote,
        supervisorNotes,
        employeeUpdatedAt: t.employeeUpdatedAt ? t.employeeUpdatedAt.toISOString() : null,
        supervisorReviewedAt: t.supervisorReviewedAt ? t.supervisorReviewedAt.toISOString() : null,
        validatedAt: t.validatedAt ? t.validatedAt.toISOString() : null,
        isValidated: t.isValidated,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        member: {
          id: t.assignedEmployee.id,
          firstName: t.assignedEmployee.firstName,
          lastName: t.assignedEmployee.lastName,
          email: t.assignedEmployee.email,
          position: t.assignedEmployee.poste,
          department: t.assignedEmployee.department,
          isActive: t.assignedEmployee.isActive
        }
      };
    });

    return NextResponse.json({
      teams,
      tasks: formattedTasks
    });
  } catch (error) {
    console.error('Erreur GET /api/superviseur/team-tasks:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { teamId, assignedEmployeeId, title, description, dateDebut, dateFin, priority } = body;

    if (!teamId || !assignedEmployeeId || !title) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    // Verify supervision rights
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN' || session.user.employerId === 'super-admin-id';
    if (!isSuperAdmin) {
      const team = await prisma.equipe.findFirst({
        where: { id: teamId, superviseurId: session.user.employerId }
      });
      if (!team) {
        return NextResponse.json({ error: 'Non autorisé à créer une tâche pour cette équipe' }, { status: 403 });
      }
    }

    const task = await prisma.teamTask.create({
      data: {
        teamId,
        assignedEmployeeId,
        createdByManagedUserId: session.user.id,
        title,
        description: description || null,
        dateDebut: dateDebut ? new Date(dateDebut) : null,
        dateFin: dateFin ? new Date(dateFin) : null,
        priority: priority || 'normale',
        status: 'a_faire',
      },
      include: {
        assignedEmployee: true,
        notes: true
      }
    });

    return NextResponse.json({
      task: {
        id: task.id,
        teamId: task.teamId,
        assignedEmployeeId: task.assignedEmployeeId,
        createdByManagedUserId: task.createdByManagedUserId,
        title: task.title,
        description: task.description,
        dateDebut: task.dateDebut ? task.dateDebut.toISOString() : null,
        dateFin: task.dateFin ? task.dateFin.toISOString() : null,
        priority: task.priority,
        status: task.status,
        employeeNote: task.employeeNote,
        employeeStatusNotes: [],
        supervisorNote: task.supervisorNote,
        supervisorNotes: [],
        employeeUpdatedAt: task.employeeUpdatedAt ? task.employeeUpdatedAt.toISOString() : null,
        supervisorReviewedAt: task.supervisorReviewedAt ? task.supervisorReviewedAt.toISOString() : null,
        validatedAt: task.validatedAt ? task.validatedAt.toISOString() : null,
        isValidated: task.isValidated,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        member: {
          id: task.assignedEmployee.id,
          firstName: task.assignedEmployee.firstName,
          lastName: task.assignedEmployee.lastName,
          email: task.assignedEmployee.email,
          position: task.assignedEmployee.poste,
          department: task.assignedEmployee.department,
          isActive: task.assignedEmployee.isActive
        }
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Erreur POST /api/superviseur/team-tasks:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    const { status, supervisorNote, employeeNote, isValidated } = body;

    const task = await prisma.teamTask.findUnique({
      where: { id },
      include: {
        assignedEmployee: true,
        team: true
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN' || session.user.employerId === 'super-admin-id';
    const isSupervisor = task.team.superviseurId === session.user.employerId;
    const isAssignee = task.assignedEmployeeId === session.user.employerId;

    if (!isSuperAdmin && !isSupervisor && !isAssignee) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (isValidated !== undefined) {
      updateData.isValidated = isValidated;
      if (isValidated) {
        updateData.validatedAt = new Date();
        updateData.status = 'termine';
      }
    }

    if (supervisorNote !== undefined && (isSupervisor || isSuperAdmin)) {
      updateData.supervisorNote = supervisorNote;
      updateData.supervisorReviewedAt = new Date();
      await prisma.teamTaskNote.create({
        data: {
          taskId: id,
          type: 'SUPERVISOR',
          note: supervisorNote
        }
      });
    }

    if (employeeNote !== undefined && isAssignee) {
      updateData.employeeNote = employeeNote;
      updateData.employeeUpdatedAt = new Date();
      await prisma.teamTaskNote.create({
        data: {
          taskId: id,
          type: 'EMPLOYEE',
          status: status || task.status,
          note: employeeNote
        }
      });
    }

    const updatedTask = await prisma.teamTask.update({
      where: { id },
      data: updateData,
      include: {
        assignedEmployee: true,
        notes: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const employeeStatusNotes = updatedTask.notes
      .filter(n => n.type === 'EMPLOYEE')
      .map(n => ({ status: n.status as any, note: n.note, createdAt: n.createdAt.toISOString() }));
    const supervisorNotes = updatedTask.notes
      .filter(n => n.type === 'SUPERVISOR')
      .map(n => ({ note: n.note, createdAt: n.createdAt.toISOString() }));

    return NextResponse.json({
      task: {
        id: updatedTask.id,
        teamId: updatedTask.teamId,
        assignedEmployeeId: updatedTask.assignedEmployeeId,
        createdByManagedUserId: updatedTask.createdByManagedUserId,
        title: updatedTask.title,
        description: updatedTask.description,
        dateDebut: updatedTask.dateDebut ? updatedTask.dateDebut.toISOString() : null,
        dateFin: updatedTask.dateFin ? updatedTask.dateFin.toISOString() : null,
        priority: updatedTask.priority,
        status: updatedTask.status,
        employeeNote: updatedTask.employeeNote,
        employeeStatusNotes,
        supervisorNote: updatedTask.supervisorNote,
        supervisorNotes,
        employeeUpdatedAt: updatedTask.employeeUpdatedAt ? updatedTask.employeeUpdatedAt.toISOString() : null,
        supervisorReviewedAt: updatedTask.supervisorReviewedAt ? updatedTask.supervisorReviewedAt.toISOString() : null,
        validatedAt: updatedTask.validatedAt ? updatedTask.validatedAt.toISOString() : null,
        isValidated: updatedTask.isValidated,
        createdAt: updatedTask.createdAt.toISOString(),
        updatedAt: updatedTask.updatedAt.toISOString(),
        member: {
          id: updatedTask.assignedEmployee.id,
          firstName: updatedTask.assignedEmployee.firstName,
          lastName: updatedTask.assignedEmployee.lastName,
          email: updatedTask.assignedEmployee.email,
          poste: updatedTask.assignedEmployee.poste,
          department: updatedTask.assignedEmployee.department,
          isActive: updatedTask.assignedEmployee.isActive
        }
      }
    });
  } catch (error) {
    console.error('Erreur PATCH /api/superviseur/team-tasks/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

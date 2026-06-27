import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.employerId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const taskId = id;
    const body = await request.json();
    const { status, note } = body;

    if (!status) {
      return NextResponse.json({ error: 'Statut manquant' }, { status: 400 });
    }

    const task = await prisma.teamTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 });
    }

    if (task.assignedEmployeeId !== session.user.employerId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    if (task.isValidated) {
      return NextResponse.json({ error: 'La tâche est déjà validée' }, { status: 400 });
    }

    const updatedTask = await prisma.teamTask.update({
      where: { id: taskId },
      data: {
        status,
        employeeNote: note || task.employeeNote,
        employeeUpdatedAt: new Date(),
        notes: {
          create: {
            type: 'EMPLOYEE',
            status,
            note: note || '',
          }
        }
      },
      include: {
        notes: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    const employeeNotes = updatedTask.notes
      .filter(n => n.type === 'EMPLOYEE')
      .map(n => ({ status: n.status || updatedTask.status, note: n.note, createdAt: n.createdAt.toISOString() }));
    
    const supervisorNotes = updatedTask.notes
      .filter(n => n.type === 'SUPERVISOR')
      .map(n => ({ note: n.note, createdAt: n.createdAt.toISOString() }));

    const formattedTask = {
      id: updatedTask.id,
      teamId: updatedTask.teamId,
      title: updatedTask.title,
      description: updatedTask.description,
      priority: updatedTask.priority,
      status: updatedTask.status,
      employeeNote: updatedTask.employeeNote,
      employeeStatusNotes: employeeNotes,
      supervisorNote: updatedTask.supervisorNote,
      supervisorNotes: supervisorNotes,
      isValidated: updatedTask.isValidated,
      validatedAt: updatedTask.validatedAt?.toISOString() || null,
      createdAt: updatedTask.createdAt.toISOString(),
      updatedAt: updatedTask.updatedAt.toISOString(),
    };

    return NextResponse.json({ task: formattedTask });
  } catch (error) {
    console.error('Erreur PATCH /api/compte-employer/team-tasks/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

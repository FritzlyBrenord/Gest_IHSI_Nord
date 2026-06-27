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

    const teamTasks = await prisma.teamTask.findMany({
      where: {
        assignedEmployeeId: employerId,
      },
      include: {
        notes: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedTasks = teamTasks.map(task => {
      const employeeNotes = task.notes
        .filter(n => n.type === 'EMPLOYEE')
        .map(n => ({ status: n.status || task.status, note: n.note, createdAt: n.createdAt.toISOString() }));
      
      const supervisorNotes = task.notes
        .filter(n => n.type === 'SUPERVISOR')
        .map(n => ({ note: n.note, createdAt: n.createdAt.toISOString() }));

      return {
        id: task.id,
        teamId: task.teamId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        employeeNote: task.employeeNote,
        employeeStatusNotes: employeeNotes,
        supervisorNote: task.supervisorNote,
        supervisorNotes: supervisorNotes,
        isValidated: task.isValidated,
        validatedAt: task.validatedAt?.toISOString() || null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      tasks: formattedTasks
    });
  } catch (error) {
    console.error('Erreur GET /api/compte-employer/team-tasks:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

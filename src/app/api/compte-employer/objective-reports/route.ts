import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.employerId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');
    const objectiveId = searchParams.get('objectiveId');

    if (!meetingId || !objectiveId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const objective = await prisma.objective.findUnique({
      where: { id: meetingId }
    });

    if (!objective) {
      return NextResponse.json({ error: 'Objectif introuvable' }, { status: 404 });
    }

    const plans = objective.plans as any[];
    if (!Array.isArray(plans)) {
      return NextResponse.json({ error: 'Format de plans invalide' }, { status: 500 });
    }

    let foundTask: any = null;

    for (const plan of plans) {
      if (!Array.isArray(plan.tasks)) continue;
      for (const task of plan.tasks) {
        if (task.id === objectiveId) {
          foundTask = task;
          break;
        }
      }
      if (foundTask) break;
    }

    if (!foundTask) {
      return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });
    }

    // Return employee notes from history array
    const history = [];
    if (foundTask.employeeNotes && Array.isArray(foundTask.employeeNotes)) {
      foundTask.employeeNotes.forEach((empNote: any) => {
        history.push({
          status: empNote.status || foundTask.status || 'NON_COMMENCE',
          note: empNote.note,
          createdAt: empNote.createdAt,
          isAdmin: false
        });
      });
    } else if (foundTask.progressNote) {
      // Fallback for old data structure
      history.push({
        status: foundTask.status || 'NON_COMMENCE',
        note: foundTask.progressNote,
        createdAt: objective.updatedAt.toISOString(),
        isAdmin: false
      });
    }

    // Add admin notes to history
    if (foundTask.adminNotes && Array.isArray(foundTask.adminNotes)) {
      foundTask.adminNotes.forEach((adminNote: any) => {
        history.push({
          status: foundTask.status || 'NON_COMMENCE',
          note: adminNote.note,
          createdAt: adminNote.createdAt,
          isAdmin: true
        });
      });
    }

    // Sort by createdAt
    history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Erreur GET /api/compte-employer/objective-reports:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.employerId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { meetingId, objectiveId, status, note } = body;

    if (!meetingId || !objectiveId || !status) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const objectiveRecord = await prisma.objective.findUnique({
      where: { id: meetingId }
    });

    if (!objectiveRecord) {
      return NextResponse.json({ error: 'Objectif (réunion) introuvable' }, { status: 404 });
    }

    if (objectiveRecord.isEvaluated) {
      return NextResponse.json({ error: 'Cet objectif a déjà été évalué' }, { status: 403 });
    }

    const plans = objectiveRecord.plans as any[];
    if (!Array.isArray(plans)) {
      return NextResponse.json({ error: 'Format de plans invalide' }, { status: 500 });
    }

    let taskFound = false;
    let unauthorized = true;

    const employerId = session.user.employerId;

    // Check teams
    const userTeams = await prisma.equipe.findMany({
      where: {
        members: {
          some: { employerId }
        }
      },
      select: { id: true }
    });
    const teamIds = userTeams.map(t => t.id);

    for (const plan of plans) {
      if (!Array.isArray(plan.tasks)) continue;

      for (const task of plan.tasks) {
        if (task.id === objectiveId) {
          taskFound = true;
          // Verify authorization
          if (
            (task.responsibleType === 'personne' && task.personId === employerId) ||
            (task.responsibleType === 'equipe' && task.teamId && teamIds.includes(task.teamId)) ||
            (task.personId === employerId) ||
            (task.teamId && teamIds.includes(task.teamId))
          ) {
            unauthorized = false;
            task.status = status;
            // Add employee note to history array
            if (!task.employeeNotes) {
              task.employeeNotes = [];
            }
            task.employeeNotes.push({
              note: note || '',
              status: status,
              createdAt: new Date().toISOString()
            });
            // Also update progressNote for backward compatibility
            task.progressNote = note;
            break;
          }
        }
      }
      if (taskFound) break;
    }

    if (!taskFound) {
      return NextResponse.json({ error: 'Tâche introuvable dans cet objectif' }, { status: 404 });
    }

    if (unauthorized) {
      return NextResponse.json({ error: 'Non autorisé à modifier cette tâche' }, { status: 403 });
    }

    await prisma.objective.update({
      where: { id: meetingId },
      data: { plans: plans }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur POST /api/compte-employer/objective-reports:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

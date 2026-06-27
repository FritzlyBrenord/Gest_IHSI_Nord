import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  sendMeetingRescheduled,
  sendStatusChangeNotification,
  sendBulkEmails,
} from '@/lib/email';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        reportResponsible: {
          select: { id: true, firstName: true, lastName: true, poste: true, department: true }
        },
        participants: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, poste: true, department: true, email: true } }
          }
        },
        trainingDocuments: true,
        reports: {
          select: { id: true, title: true, workflowStatus: true, visibility: true, createdAt: true, updatedAt: true, employer: { select: { firstName: true, lastName: true } }, reviewComment: true }
        }
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
    }

    const formattedMeeting = {
      ...meeting,
      reportResponsible: meeting.reportResponsible ? {
        id: meeting.reportResponsible.id,
        firstName: meeting.reportResponsible.firstName,
        lastName: meeting.reportResponsible.lastName,
        position: meeting.reportResponsible.poste,
        department: meeting.reportResponsible.department,
      } : null,
      participants: meeting.participants.map(p => ({
        id: p.id,
        employeeId: p.employeeId,
        wasPresent: p.wasPresent,
        attendanceMode: p.attendanceMode,
        employee: {
          id: p.employee.id,
          firstName: p.employee.firstName,
          lastName: p.employee.lastName,
          position: p.employee.poste,
          department: p.employee.department,
        }
      })),
      reports: meeting.reports,
    };

    return NextResponse.json({ meeting: formattedMeeting });
  } catch (error) {
    console.error('Erreur GET /api/meetings/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Récupérer l'événement existant avec ses participants pour les emails
    const existing = await prisma.meeting.findUnique({
      where: { id },
      include: {
        participants: {
          include: { employee: { select: { email: true } } }
        },
        reportResponsible: { select: { email: true } }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
    }

    const isStatusChange = body.status && body.status !== existing.status;
    const isReschedule = !isStatusChange && body.startAt && body.startAt !== new Date(existing.startAt).toISOString().slice(0, 16);

    const updated = await prisma.meeting.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.trainer !== undefined && { trainer: body.trainer }),
        ...(body.startAt && { startAt: new Date(body.startAt) }),
        ...(body.durationMins && { durationMins: body.durationMins }),
        ...(body.type && { type: body.type }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.platform !== undefined && { platform: body.platform }),
        ...(body.meetingUrl !== undefined && { meetingUrl: body.meetingUrl }),
        ...(body.reportResponsibleId !== undefined && { reportResponsibleId: body.reportResponsibleId || null }),
      },
      include: {
        reportResponsible: { select: { firstName: true, lastName: true, poste: true, email: true } },
        participants: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, poste: true, email: true } }
          }
        },
        trainingDocuments: { select: { id: true } }
      }
    });

    const formattedMeeting = {
      ...updated,
      reportResponsible: updated.reportResponsible ? {
        firstName: updated.reportResponsible.firstName,
        lastName: updated.reportResponsible.lastName,
        position: updated.reportResponsible.poste,
      } : null,
      participants: updated.participants.map(p => ({
        id: p.id,
        employeeId: p.employeeId,
        wasPresent: p.wasPresent,
        attendanceMode: p.attendanceMode,
        employee: {
          id: p.employee.id,
          firstName: p.employee.firstName,
          lastName: p.employee.lastName,
          position: p.employee.poste,
        }
      }))
    };

    // Emails asynchrones (ne bloque pas la réponse)
    const participantEmails = existing.participants
      .map(p => p.employee.email)
      .filter((email): email is string => !!email);

    let emailDelivery: { attempted: boolean; sent?: number; failed?: number } = { attempted: false };

    if (isStatusChange) {
      // Email de changement de statut → tous les participants
      const emailStats = await sendBulkEmails(participantEmails, (to) =>
        sendStatusChangeNotification(to, {
          title: updated.title,
          startAt: updated.startAt,
          status: body.status,
        })
      );
      emailDelivery = { attempted: true, ...emailStats };
    } else if (isReschedule) {
      // Email de reprogrammation → tous les participants
      const emailStats = await sendBulkEmails(participantEmails, (to) =>
        sendMeetingRescheduled(to, {
          title: updated.title,
          startAt: updated.startAt,
          durationMins: updated.durationMins,
          type: updated.type,
          location: updated.location,
          platform: updated.platform,
          meetingUrl: updated.meetingUrl,
        })
      );
      emailDelivery = { attempted: true, ...emailStats };
    }

    return NextResponse.json({ meeting: formattedMeeting, success: true, emailDelivery });
  } catch (error) {
    console.error('Erreur PUT /api/meetings/[id]:', error);
    return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await prisma.meeting.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE /api/meetings/[id]:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}

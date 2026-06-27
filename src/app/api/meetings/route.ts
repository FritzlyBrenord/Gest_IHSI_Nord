import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMeetingInvitation, sendReporterNotification } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      category, title, description, trainer, reportResponsibleId,
      startAt, durationMins, type, location, platform, meetingUrl,
      participantIds, groupIds, selectAll, trainingDocuments
    } = body;

    if (!title || !startAt || !durationMins || !type) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    let finalParticipantIds = new Set<string>();

    if (selectAll) {
      const allActive = await prisma.employer.findMany({
        where: { isActive: true },
        select: { id: true, email: true }
      });
      allActive.forEach(emp => finalParticipantIds.add(emp.id));
    } else {
      if (participantIds && Array.isArray(participantIds)) {
        participantIds.forEach(id => finalParticipantIds.add(id));
      }
      if (groupIds && Array.isArray(groupIds)) {
        const teams = await prisma.equipe.findMany({
          where: { id: { in: groupIds } },
          include: { members: true }
        });
        teams.forEach(team => {
          team.members.forEach(member => finalParticipantIds.add(member.employerId));
        });
      }
    }

    const meeting = await prisma.meeting.create({
      data: {
        category,
        title,
        description,
        trainer,
        reportResponsibleId: reportResponsibleId || null,
        startAt: new Date(startAt),
        durationMins,
        type,
        location,
        platform,
        meetingUrl,
        participants: {
          create: Array.from(finalParticipantIds).map(id => ({ employeeId: id }))
        },
        trainingDocuments: trainingDocuments && trainingDocuments.length > 0 ? {
          create: trainingDocuments.map((doc: any) => ({
            key: doc.key || '',
            url: doc.url || '',
            name: doc.name || doc.key || 'Document',
            mimeType: doc.mimeType || 'application/octet-stream',
            size: doc.size || 0,
          }))
        } : undefined
      },
      include: {
        participants: { include: { employee: true } },
        reportResponsible: true,
      }
    });

    // Envoyer les emails
    const emailPromises: Promise<any>[] = [];
    let sent = 0;
    let failed = 0;
    let errors: string[] = [];

    const dateObj = new Date(startAt);
    const dateStr = dateObj.toLocaleDateString('fr-FR');
    const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const emailDetails = {
      title, dateStr, timeStr, mode: type, location, platform, meetingUrl
    };

    meeting.participants.forEach(p => {
      if (p.employee.email) {
        emailPromises.push(
          sendMeetingInvitation(p.employee.email, emailDetails)
            .then(() => sent++)
            .catch(err => {
              failed++;
              errors.push(err.message);
              console.error('Failed to send invite to:', p.employee.email, err);
            })
        );
      }
    });

    if (meeting.reportResponsible && meeting.reportResponsible.email) {
      emailPromises.push(
        sendReporterNotification(meeting.reportResponsible.email, emailDetails)
          .then(() => sent++)
          .catch(err => {
            failed++;
            errors.push(err.message);
            console.error('Failed to send reporter notification to:', meeting.reportResponsible?.email, err);
          })
      );
    }

    // On n'attend pas forcément que tous les emails soient envoyés pour répondre au frontend,
    // mais ici on fait un Promise.allSettled pour avoir les statistiques.
    if (emailPromises.length > 0) {
      await Promise.allSettled(emailPromises);
    }

    return NextResponse.json({
      meeting,
      emailDelivery: {
        attempted: emailPromises.length > 0,
        sent,
        failed,
        errors: errors.slice(0, 3) // Ne renvoyer que les 3 premières erreurs pour ne pas surcharger
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur POST /api/meetings:', error);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const meetings = await prisma.meeting.findMany({
      include: {
        reportResponsible: {
          select: { id: true, firstName: true, lastName: true, poste: true, department: true }
        },
        participants: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, poste: true } }
          }
        },
        trainingDocuments: { select: { id: true } },
        reports: {
          select: { id: true, title: true, workflowStatus: true, visibility: true, createdAt: true, updatedAt: true, reviewComment: true, employer: { select: { firstName: true, lastName: true } } }
        }
      },
      orderBy: { startAt: 'desc' }
    });

    const formattedMeetings = meetings.map(m => ({
      ...m,
      reportResponsible: m.reportResponsible ? {
        id: m.reportResponsible.id,
        firstName: m.reportResponsible.firstName,
        lastName: m.reportResponsible.lastName,
        position: m.reportResponsible.poste,
        department: m.reportResponsible.department,
      } : null,
      participants: m.participants.map(p => ({
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
      })),
      reports: m.reports,
    }));

    return NextResponse.json({ meetings: formattedMeetings });
  } catch (error) {
    console.error('Erreur GET /api/meetings:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des événements' }, { status: 500 });
  }
}

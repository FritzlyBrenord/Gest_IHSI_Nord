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

    // ─── Envoi séquentiel avec délai pour éviter le throttling Gmail ───
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    const dateObj = new Date(startAt);
    const emailDetails = {
      title, startAt: dateObj, durationMins, type, location, platform, meetingUrl
    };

    for (const p of meeting.participants) {
      if (p.employee.email) {
        try {
          await sendMeetingInvitation(p.employee.email, emailDetails);
          sent++;
          console.log(`✅ Email envoyé à : ${p.employee.email}`);
        } catch (err: any) {
          failed++;
          errors.push(err.message);
          console.error(`❌ Échec envoi à ${p.employee.email}:`, err.message);
        }
        // Attendre 2 secondes entre chaque email
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (meeting.reportResponsible?.email) {
      try {
        await sendReporterNotification(meeting.reportResponsible.email, emailDetails);
        sent++;
        console.log(`✅ Notification rapport envoyée à : ${meeting.reportResponsible.email}`);
      } catch (err: any) {
        failed++;
        errors.push(err.message);
        console.error(`❌ Échec notification rapport à ${meeting.reportResponsible.email}:`, err.message);
      }
    }

    return NextResponse.json({
      meeting,
      emailDelivery: {
        attempted: meeting.participants.length,
        sent,
        failed,
        errors: errors.slice(0, 3)
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
        poste: m.reportResponsible.poste,
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
          poste: p.employee.poste,
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
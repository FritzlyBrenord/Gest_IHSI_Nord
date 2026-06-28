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

    const meetings = await prisma.meeting.findMany({
      where: {
        participants: {
          some: {
            employeeId: employerId
          }
        }
      },
      include: {
        reportResponsible: {
          select: { id: true, firstName: true, lastName: true, poste: true, department: true }
        },
        participants: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, poste: true } }
          }
        },
        trainingDocuments: {
          select: { id: true, key: true, url: true, name: true, mimeType: true, size: true }
        },
        reports: {
          select: { id: true, title: true, workflowStatus: true, visibility: true, createdAt: true, updatedAt: true, reviewComment: true, employer: { select: { firstName: true, lastName: true } } }
        }
      },
      orderBy: { startAt: 'desc' }
    });

    const formattedMeetings = meetings.map(m => ({
      id: m.id,
      category: m.category,
      title: m.title,
      description: m.description,
      trainer: m.trainer,
      startAt: m.startAt.toISOString(),
      durationMins: m.durationMins,
      type: m.type,
      location: m.location,
      platform: m.platform,
      meetingUrl: m.meetingUrl,
      status: m.status,
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
      trainingDocuments: m.trainingDocuments,
      reports: m.reports,
    }));

    return NextResponse.json({ meetings: formattedMeetings });
  } catch (error) {
    console.error('Erreur GET /api/compte-employer/events:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des événements' }, { status: 500 });
  }
}

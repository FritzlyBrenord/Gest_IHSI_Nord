import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: meetingId } = await params;
    const body = await req.json();
    const { attendances } = body; // Array of { participantId, status: 'PRESENT' | 'PRESENTIEL' | 'EN_LIGNE' | 'ABSENT' }

    if (!Array.isArray(attendances)) {
      return NextResponse.json({ error: 'Format invalide' }, { status: 400 });
    }

    // Update each participant
    for (const att of attendances) {
      if (att.participantId) {
        const wasPresent = att.status !== 'ABSENT';
        const attendanceMode = att.status;
        await prisma.meetingParticipant.update({
          where: { id: att.participantId },
          data: {
            wasPresent,
            attendanceMode
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur PUT /api/meetings/[id]/attendance:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

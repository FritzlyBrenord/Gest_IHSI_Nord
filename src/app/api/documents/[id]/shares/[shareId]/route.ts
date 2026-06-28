import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const { shareId } = await params;
    await prisma.documentShare.delete({
      where: { id: shareId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE /api/documents/[id]/shares/[shareId]:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression du partage' }, { status: 500 });
  }
}

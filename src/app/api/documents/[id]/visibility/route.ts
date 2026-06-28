import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { visibility } = await req.json();

    if (!visibility || !['prive', 'public', 'partage'].includes(visibility)) {
      return NextResponse.json({ error: 'Visibilité invalide' }, { status: 400 });
    }

    const document = await prisma.document.update({
      where: { id },
      data: { visibility },
    });

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Erreur PATCH /api/documents/[id]/visibility:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la visibilité' }, { status: 500 });
  }
}

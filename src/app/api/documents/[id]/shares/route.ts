import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shares = await prisma.documentShare.findMany({
      where: { documentId: id },
      include: {
        sharedWith: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            poste: true,
          },
        },
        sharedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { sharedAt: 'desc' },
    });

    return NextResponse.json({ shares });
  } catch (error) {
    console.error('Erreur GET /api/documents/[id]/shares:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des partages' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.employerId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { sharedWithId, permission, expiresAt } = await req.json();

    if (!sharedWithId || !permission || !['read', 'write'].includes(permission)) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    // Vérifier si le partage existe déjà
    const existing = await prisma.documentShare.findUnique({
      where: {
        documentId_sharedWithId: {
          documentId: id,
          sharedWithId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Ce document est déjà partagé avec cet employé' }, { status: 400 });
    }

    const share = await prisma.documentShare.create({
      data: {
        documentId: id,
        sharedWithId,
        sharedById: session.user.employerId,
        permission,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        sharedWith: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            poste: true,
          },
        },
        sharedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    console.error('Erreur POST /api/documents/[id]/shares:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du partage' }, { status: 500 });
  }
}

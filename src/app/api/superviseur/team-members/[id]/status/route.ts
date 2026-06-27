import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    const { isActive } = body;

    if (isActive === undefined) {
      return NextResponse.json({ error: 'Champ isActive manquant' }, { status: 400 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN' || session.user.employerId === 'super-admin-id';

    if (!isSuperAdmin) {
      // Vérifier que le membre appartient à une équipe supervisée par l'utilisateur
      const teamMember = await prisma.equipeMember.findFirst({
        where: {
          employerId: id,
          equipe: {
            superviseurId: session.user.employerId
          }
        }
      });

      if (!teamMember) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
      }
    }

    const updatedEmployer = await prisma.employer.update({
      where: { id },
      data: { isActive }
    });

    return NextResponse.json({
      member: {
        id: updatedEmployer.id,
        firstName: updatedEmployer.firstName,
        lastName: updatedEmployer.lastName,
        isActive: updatedEmployer.isActive
      }
    });
  } catch (error) {
    console.error('Erreur PATCH /api/superviseur/team-members/[id]/status:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

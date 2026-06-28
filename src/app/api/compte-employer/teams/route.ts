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

    const teams = await prisma.equipe.findMany({
      where: {
        members: {
          some: {
            employerId: employerId
          }
        }
      },
      include: {
        superviseur: true,
        members: {
          include: {
            employer: true
          }
        }
      }
    });

    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      supervisor: {
        id: team.superviseur.id,
        firstName: team.superviseur.firstName,
        lastName: team.superviseur.lastName,
        email: team.superviseur.email,
        poste: team.superviseur.poste,
        department: team.superviseur.department,
        isActive: team.superviseur.isActive,
      },
      members: team.members.map(m => ({
        id: m.employer.id,
        firstName: m.employer.firstName,
        lastName: m.employer.lastName,
        email: m.employer.email,
        poste: m.employer.poste,
        department: m.employer.department,
        isActive: m.employer.isActive,
      }))
    }));

    return NextResponse.json({
      teams: formattedTeams
    });
  } catch (error) {
    console.error('Erreur GET /api/compte-employer/teams:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

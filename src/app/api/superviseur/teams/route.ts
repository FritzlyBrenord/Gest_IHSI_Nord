import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN' || session.user.employerId === 'super-admin-id';

    const supervisorInfo = isSuperAdmin ? {
      id: session.user.id,
      employeeId: null,
      email: session.user.email,
      firstName: 'Super',
      lastName: 'Admin',
      poste: 'Direction',
      department: 'Direction Générale'
    } : {
      id: session.user.id,
      employeeId: session.user.employerId,
      email: session.user.email,
      firstName: session.user.name?.split(' ')[0] || '',
      lastName: session.user.name?.split(' ').slice(1).join(' ') || '',
      poste: session.user.role,
      department: ''
    };

    const teams = await prisma.equipe.findMany({
      where: isSuperAdmin ? {} : {
        superviseurId: session.user.employerId
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
        deletedAt: null
      },
      members: team.members.map(m => ({
        id: m.employer.id,
        firstName: m.employer.firstName,
        lastName: m.employer.lastName,
        email: m.employer.email,
        poste: m.employer.poste,
        department: m.employer.department,
        isActive: m.employer.isActive,
        deletedAt: null
      }))
    }));

    return NextResponse.json({
      supervisor: supervisorInfo,
      teams: formattedTeams
    });
  } catch (error) {
    console.error('Erreur GET /api/superviseur/teams:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

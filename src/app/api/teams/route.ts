import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');

    const where: Prisma.EquipeWhereInput = {};
    if (department) {
      where.OR = [
        { superviseur: { department: { equals: department, mode: 'insensitive' } } },
        { members: { some: { employer: { department: { equals: department, mode: 'insensitive' } } } } }
      ];
    }

    const teams = await prisma.equipe.findMany({
      where,
      include: {
        superviseur: {
          select: { id: true, firstName: true, lastName: true, poste: true, department: true },
        },
        members: {
          include: {
            employer: {
              select: { id: true, firstName: true, lastName: true, poste: true, department: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formattedTeams = teams.map((team) => ({
      id: team.id,
      name: team.name,
      supervisor: team.superviseur,
      members: team.members.map((m) => m.employer),
    }));

    return NextResponse.json({ teams: formattedTeams });
  } catch (error) {
    console.error('Erreur GET /api/teams:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des équipes' }, { status: 500 });
  }
}

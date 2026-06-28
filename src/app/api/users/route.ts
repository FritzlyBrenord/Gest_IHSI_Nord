import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { AccountCreationError, createUtilisateurForEmployer } from '@/lib/account-creation';

const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPERVISEUR', 'SECRETAIRE', 'EXECUTANT'] as const;

type AppRole = (typeof VALID_ROLES)[number];

function isRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (VALID_ROLES as readonly string[]).includes(value);
}

export async function GET() {
  try {
    const employers = await prisma.employer.findMany({
      include: {
        utilisateur: true,
        equipesSupervisees: {
          include: {
            members: {
              include: {
                employer: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const users = employers.map((emp) => ({
      id: emp.id,
      employeeId: emp.id,
      role: emp.utilisateur?.role ?? emp.role,
      isBlocked: !emp.isActive,
      hasAccount: Boolean(emp.utilisateur),
      employee: {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        poste: emp.poste,
        department: emp.department,
        isActive: emp.isActive,
      },
      teams: emp.equipesSupervisees.map((team) => ({
        id: team.id,
        name: team.name,
        members: team.members.map((member) => ({
          id: member.employer.id,
          firstName: member.employer.firstName,
          lastName: member.employer.lastName,
          email: member.employer.email,
          poste: member.employer.poste,
          department: member.employer.department,
          isActive: member.employer.isActive,
        })),
      })),
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Erreur GET /api/users:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des utilisateurs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      employeeId,
      role,
      createAccount = false,
      password,
      teamName,
      memberIds,
    } = body;

    if (!employeeId || !role) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    if (!isRole(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }

    const employer = await prisma.employer.findUnique({
      where: { id: employeeId },
      include: { utilisateur: true },
    });

    if (!employer) {
      return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });
    }

    await prisma.employer.update({
      where: { id: employeeId },
      data: { role: role as Role },
    });

    let accountCreated = false;

    if (createAccount) {
      await createUtilisateurForEmployer(
        {
          ...employer,
          role: role as Role,
        },
        password
      );
      accountCreated = true;
    }

    if (role === 'SUPERVISEUR' && teamName) {
      const existingTeam = await prisma.equipe.findFirst({
        where: { superviseurId: employeeId },
      });

      if (existingTeam) {
        await prisma.equipe.update({
          where: { id: existingTeam.id },
          data: { name: teamName },
        });

        await prisma.equipeMember.deleteMany({
          where: { equipeId: existingTeam.id },
        });

        if (Array.isArray(memberIds) && memberIds.length > 0) {
          await prisma.equipeMember.createMany({
            data: memberIds.map((id: string) => ({
              equipeId: existingTeam.id,
              employerId: id,
            })),
          });
        }
      } else {
        await prisma.equipe.create({
          data: {
            name: teamName,
            superviseurId: employeeId,
            members: {
              create: (Array.isArray(memberIds) ? memberIds : []).map((id: string) => ({
                employerId: id,
              })),
            },
          },
        });
      }
    }

    return NextResponse.json({ success: true, accountCreated });
  } catch (error) {
    console.error('Erreur POST /api/users:', error);
    if (error instanceof AccountCreationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Erreur lors de la création de l\'utilisateur' }, { status: 500 });
  }
}

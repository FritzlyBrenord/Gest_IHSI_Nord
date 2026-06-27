import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { AccountCreationError, createUtilisateurForEmployer } from '@/lib/account-creation';

const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPERVISEUR', 'SECRETAIRE', 'EXECUTANT'] as const;

type AppRole = (typeof VALID_ROLES)[number];

function isRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (VALID_ROLES as readonly string[]).includes(value);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: employeeId } = await params;
    const body = await req.json();
    const { role, teamName, memberIds, isBlocked, createAccount, password } = body;

    const employer = await prisma.employer.findUnique({
      where: { id: employeeId },
      include: { utilisateur: true },
    });

    if (!employer) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    if (isBlocked !== undefined) {
      await prisma.employer.update({
        where: { id: employeeId },
        data: { isActive: !isBlocked },
      });
      return NextResponse.json({ success: true });
    }

    if (role && !isRole(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }

    if (role && role !== employer.role) {
      await prisma.employer.update({
        where: { id: employeeId },
        data: { role: role as Role },
      });
      if (employer.utilisateur) {
        await prisma.utilisateur.update({
          where: { id: employer.utilisateur.id },
          data: { role: role as Role },
        });
      }
      if (role !== 'SUPERVISEUR') {
        await prisma.equipe.deleteMany({ where: { superviseurId: employeeId } });
      }
    }

    if (createAccount && !employer.utilisateur) {
      await createUtilisateurForEmployer(
        {
          ...employer,
          role: (role as Role) || employer.role,
        },
        password,
        (role as Role) || employer.role
      );
    }

    if (role === 'SUPERVISEUR') {
      const existingTeam = await prisma.equipe.findFirst({ where: { superviseurId: employeeId } });

      if (existingTeam) {
        await prisma.equipe.update({
          where: { id: existingTeam.id },
          data: { name: teamName || existingTeam.name },
        });
        await prisma.equipeMember.deleteMany({ where: { equipeId: existingTeam.id } });
        if (memberIds && memberIds.length > 0) {
          await prisma.equipeMember.createMany({
            data: memberIds.map((memberId: string) => ({ equipeId: existingTeam.id, employerId: memberId })),
          });
        }
      } else if (teamName) {
        await prisma.equipe.create({
          data: {
            name: teamName,
            superviseurId: employeeId,
            members: {
              create: (memberIds || []).map((memberId: string) => ({ employerId: memberId })),
            },
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur PUT /api/users/[id]:', error);
    if (error instanceof AccountCreationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Erreur lors de la modification de l\'utilisateur' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: employeeId } = await params;

    const employer = await prisma.employer.findUnique({
      where: { id: employeeId },
      include: { utilisateur: true },
    });

    if (!employer) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    await prisma.employer.update({
      where: { id: employeeId },
      data: { role: 'EXECUTANT' },
    });

    if (employer.utilisateur) {
      await prisma.utilisateur.update({
        where: { id: employer.utilisateur.id },
        data: { role: 'EXECUTANT' },
      });
    }

    await prisma.equipe.deleteMany({ where: { superviseurId: employeeId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE /api/users/[id]:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression de l\'utilisateur' }, { status: 500 });
  }
}

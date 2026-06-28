// src/app/api/users/[id]/password/route.ts
import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: employeeId } = await params;
    const body = await req.json();
    const { password } = body;

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }

    const employer = await prisma.employer.findUnique({
      where: { id: employeeId },
      include: { utilisateur: true },
    });

    if (!employer || !employer.utilisateur) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable ou sans compte' },
        { status: 404 }
      );
    }

    const hashedPassword = await hash(password, 12);

    await prisma.utilisateur.update({
      where: { id: employer.utilisateur.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur PUT /api/users/[id]/password:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du mot de passe' },
      { status: 500 }
    );
  }
}
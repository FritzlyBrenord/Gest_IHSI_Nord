import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email manquant' }, { status: 400 });
    }

    const employer = await prisma.employer.findUnique({
      where: { email },
      include: { utilisateur: true }
    });

    if (!employer) {
      return NextResponse.json({ error: 'Email non reconnu par le système' }, { status: 404 });
    }

    if (!employer.isActive) {
      return NextResponse.json({ error: 'Compte employé inactif, création impossible' }, { status: 403 });
    }

    if (employer.utilisateur) {
      return NextResponse.json({ error: 'Un compte est déjà activé pour cet email' }, { status: 400 });
    }

    return NextResponse.json({
      found: true,
      employee: {
        email: employer.email,
        firstName: employer.firstName,
        lastName: employer.lastName,
        poste: employer.poste,
        department: employer.department,
      }
    });

  } catch (error) {
    console.error('Erreur check-email:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

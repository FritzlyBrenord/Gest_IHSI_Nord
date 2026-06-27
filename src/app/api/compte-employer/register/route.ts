import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createUtilisateurForEmployer, AccountCreationError } from '@/lib/account-creation';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Informations invalides' }, { status: 400 });
    }

    const employer = await prisma.employer.findUnique({
      where: { email },
      include: { utilisateur: true },
    });

    if (!employer) {
      return NextResponse.json({ error: 'Email non reconnu' }, { status: 404 });
    }

    await createUtilisateurForEmployer(employer, password);

    return NextResponse.json({ success: true, redirectTo: '/login' });
  } catch (error) {
    console.error('Erreur register:', error);
    if (error instanceof AccountCreationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function isDataUrlOrUrl(value: string) {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value) || /^https?:\/\//.test(value);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN' || session.user.employerId === 'super-admin-id';
    if (isSuperAdmin) {
      return NextResponse.json({
        profile: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          photoUrl: session.user.photoUrl ?? null,
          employer: null,
          canEdit: false,
        },
      });
    }

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: session.user.id },
      include: { employer: true },
    });

    if (!utilisateur) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        id: utilisateur.id,
        email: utilisateur.email,
        name: `${utilisateur.employer.firstName} ${utilisateur.employer.lastName}`.trim(),
        role: utilisateur.role,
        photoUrl: utilisateur.photoUrl ?? null,
        employer: {
          id: utilisateur.employer.id,
          firstName: utilisateur.employer.firstName,
          lastName: utilisateur.employer.lastName,
          position: utilisateur.employer.poste,
          department: utilisateur.employer.department,
          email: utilisateur.employer.email,
          isActive: utilisateur.employer.isActive,
        },
        canEdit: true,
      },
    });
  } catch (error) {
    console.error('Erreur GET /api/profile:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN' || session.user.employerId === 'super-admin-id';
    if (isSuperAdmin) {
      return NextResponse.json({ error: 'Profil super administrateur non modifiable ici' }, { status: 403 });
    }

    const body = await req.json();
    const {
      email,
      currentPassword,
      newPassword,
      photoUrl,
    } = body;

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: session.user.id },
      include: { employer: true },
    });

    if (!utilisateur) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    const accountUpdateRequested = Boolean(email || newPassword);
    if (accountUpdateRequested) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Le mot de passe actuel est requis' }, { status: 400 });
      }

      const passwordOk = await bcrypt.compare(currentPassword, utilisateur.password);
      if (!passwordOk) {
        return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 });
      }
    }

    if (email && email !== utilisateur.email) {
      const emailTaken = await prisma.utilisateur.findUnique({ where: { email: email.toLowerCase() } });
      if (emailTaken && emailTaken.id !== utilisateur.id) {
        return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 });
      }
    }

    const nextPhotoUrl = typeof photoUrl === 'string'
      ? photoUrl.trim()
      : photoUrl === null
        ? null
        : undefined;

    if (typeof nextPhotoUrl === 'string' && nextPhotoUrl && !isDataUrlOrUrl(nextPhotoUrl)) {
      return NextResponse.json({ error: 'Format de photo invalide' }, { status: 400 });
    }

    const data: {
      email?: string;
      password?: string;
      photoUrl?: string | null;
    } = {};

    if (email) data.email = email.toLowerCase();
    if (newPassword) data.password = await bcrypt.hash(newPassword, 10);
    if (nextPhotoUrl !== undefined) data.photoUrl = nextPhotoUrl || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Aucune modification fournie' }, { status: 400 });
    }

    const updated = await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data,
      include: { employer: true },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: updated.id,
        email: updated.email,
        name: `${updated.employer.firstName} ${updated.employer.lastName}`.trim(),
        role: updated.role,
        photoUrl: updated.photoUrl ?? null,
      },
    });
  } catch (error) {
    console.error('Erreur PUT /api/profile:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

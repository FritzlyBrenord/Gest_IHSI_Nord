import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Non authentifie' },
                { status: 401 }
            );
        }

        const sessions = await prisma.inventorySession.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                lines: {
                    include: {
                        material: true,
                        checkedBy: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json({ sessions });
    } catch (error) {
        console.error('GET /api/inventory error', error);
        return NextResponse.json(
            { error: 'Erreur lors de la recuperation des sessions' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Non authentifie' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const title = String(body?.title ?? '').trim();
        const description = String(body?.description ?? '').trim();

        if (!title) {
            return NextResponse.json(
                { error: 'Le titre est requis' },
                { status: 400 }
            );
        }

        const userEmail = session.user.email;

        if (!userEmail) {
            return NextResponse.json(
                {
                    error: 'Compte administrateur invalide',
                    details: 'Aucun email trouve dans la session.',
                },
                { status: 400 }
            );
        }

        // 1. Chercher un employer existant avec le meme email
        let employer = await prisma.employer.findUnique({
            where: { email: userEmail },
        });

        // 2. Si l'employer n'existe pas, le creer
        if (!employer) {
            const nameParts = userEmail.split('@')[0].split('.');
            employer = await prisma.employer.create({
                data: {
                    firstName: nameParts[0] || 'Admin',
                    lastName: nameParts.slice(1).join(' ') || 'User',
                    email: userEmail,
                    poste: 'Administrateur',
                    department: 'Administration',
                    isActive: true,
                    role: 'ADMIN',
                },
            });
        }

        // 3. Chercher l'utilisateur par email
        let user = await prisma.utilisateur.findUnique({
            where: { email: userEmail },
            include: {
                employer: true,
            },
        });

        // 4. Si l'utilisateur n'existe pas, le creer avec l'employer
        if (!user) {
            user = await prisma.utilisateur.create({
                data: {
                    email: userEmail,
                    password: '', // Mot de passe vide car l'auth est geree par NextAuth
                    role: 'ADMIN',
                    employer: {
                        connect: { id: employer.id },
                    },
                },
                include: {
                    employer: true,
                },
            });
        }

        // 5. Si l'utilisateur existe mais n'a pas d'employer, le lier
        if (user && !user.employer) {
            user = await prisma.utilisateur.update({
                where: { id: user.id },
                data: {
                    employer: {
                        connect: { id: employer.id },
                    },
                },
                include: {
                    employer: true,
                },
            });
        }

        // 6. Utiliser l'employer final
        const finalEmployer = user?.employer || employer;

        if (!finalEmployer) {
            return NextResponse.json(
                {
                    error: 'Compte administrateur invalide',
                    details: 'Aucun employe trouve pour cet utilisateur.',
                },
                { status: 400 }
            );
        }

        if (!finalEmployer.isActive) {
            return NextResponse.json(
                {
                    error: 'Compte administrateur inactif',
                    details: 'L\'employe associe est desactive.',
                },
                { status: 400 }
            );
        }

        // 7. Verifier les droits administrateur
        const adminRoles = ['ADMIN', 'SUPER_ADMIN'];
        if (!adminRoles.includes(finalEmployer.role)) {
            return NextResponse.json(
                {
                    error: 'Permissions insuffisantes',
                    details: 'Seuls les administrateurs peuvent creer des sessions d\'inventaire.',
                    currentRole: finalEmployer.role,
                },
                { status: 403 }
            );
        }

        // 8. Creer la session d'inventaire
        const createdSession = await prisma.inventorySession.create({
            data: {
                title,
                description: description || null,
                createdById: finalEmployer.id,
                status: 'BROUILLON',
            },
        });

        return NextResponse.json(createdSession, { status: 201 });

    } catch (error: unknown) {
        console.error('POST /api/inventory error', error);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2003') {
                return NextResponse.json(
                    {
                        error: 'Erreur de reference',
                        details: 'L\'employe createur n\'existe pas ou n\'est pas valide.',
                    },
                    { status: 400 }
                );
            }
            if (error.code === 'P2002') {
                return NextResponse.json(
                    {
                        error: 'Conflit',
                        details: 'Un compte avec cet email existe deja.',
                    },
                    { status: 409 }
                );
            }
        }

        return NextResponse.json(
            { error: 'Erreur lors de la creation de la session' },
            { status: 500 }
        );
    }
}
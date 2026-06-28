import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Non authentifie' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { materialIds } = body;

        if (!materialIds || !Array.isArray(materialIds) || materialIds.length === 0) {
            return NextResponse.json(
                { error: 'Aucun materiel selectionne' },
                { status: 400 }
            );
        }

        const { id: sessionId } = await params;

        // Verifier que la session existe
        const inventorySession = await prisma.inventorySession.findUnique({
            where: { id: sessionId },
            select: { status: true },
        });

        if (!inventorySession) {
            return NextResponse.json(
                { error: 'Session non trouvee' },
                { status: 404 }
            );
        }

        if (inventorySession.status !== 'EN_COURS') {
            return NextResponse.json(
                { error: 'La session doit etre en cours pour ajouter des lignes' },
                { status: 400 }
            );
        }

        // Recuperer l'utilisateur avec son employe
        const userEmail = session.user.email;
        if (!userEmail) {
            return NextResponse.json(
                { error: 'Email utilisateur non trouve' },
                { status: 400 }
            );
        }

        let user = await prisma.utilisateur.findUnique({
            where: { email: userEmail },
            include: { employer: true },
        });

        if (!user) {
            const nameParts = userEmail.split('@')[0].split('.');
            const employer = await prisma.employer.create({
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

            user = await prisma.utilisateur.create({
                data: {
                    email: userEmail,
                    password: '',
                    role: 'ADMIN',
                    employer: {
                        connect: { id: employer.id },
                    },
                },
                include: { employer: true },
            });
        }

        if (!user.employer) {
            const employer = await prisma.employer.create({
                data: {
                    firstName: 'Admin',
                    lastName: 'User',
                    email: userEmail,
                    poste: 'Administrateur',
                    department: 'Administration',
                    isActive: true,
                    role: 'ADMIN',
                },
            });

            user = await prisma.utilisateur.update({
                where: { id: user.id },
                data: {
                    employer: {
                        connect: { id: employer.id },
                    },
                },
                include: { employer: true },
            });
        }

        const checkedById = user.employer.id;

        // Ajouter les lignes d'inventaire
        const results = [];
        const errors = [];

        for (const materialId of materialIds) {
            try {
                const material = await prisma.material.findUnique({
                    where: { id: materialId },
                });

                if (!material) {
                    errors.push(`Le materiel ${materialId} n'existe pas`);
                    continue;
                }

                const existingLine = await prisma.inventoryLine.findUnique({
                    where: {
                        sessionId_materialId: {
                            sessionId,
                            materialId,
                        },
                    },
                });

                if (existingLine) {
                    errors.push(`Le materiel ${material.name} est deja scanne`);
                    continue;
                }

                const line = await prisma.inventoryLine.create({
                    data: {
                        sessionId,
                        materialId,
                        status: 'PRESENT',
                        checkedById: checkedById,
                        checkedAt: new Date(),
                    },
                    include: {
                        material: true,
                        checkedBy: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                });

                results.push(line);
            } catch (error) {
                console.error('Erreur pour le materiel:', materialId, error);
                errors.push(`Erreur lors de l'ajout du materiel ${materialId}`);
            }
        }

        return NextResponse.json({
            success: true,
            added: results.length,
            errors: errors.length > 0 ? errors : undefined,
            lines: results,
        });

    } catch (error: unknown) {
        console.error('POST inventory lines error:', error);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2003') {
                return NextResponse.json(
                    {
                        error: 'Erreur de reference',
                        details: 'L\'employe verificateur n\'existe pas.',
                    },
                    { status: 400 }
                );
            }
            if (error.code === 'P2002') {
                return NextResponse.json(
                    {
                        error: 'Conflit',
                        details: 'Ce materiel est deja scanne dans cette session.',
                    },
                    { status: 409 }
                );
            }
        }

        return NextResponse.json(
            { error: 'Erreur lors de l\'ajout des lignes' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Non authentifie' },
                { status: 401 }
            );
        }

        const { id: sessionId } = await params;

        const lines = await prisma.inventoryLine.findMany({
            where: { sessionId },
            include: {
                material: true,
                checkedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { checkedAt: 'desc' },
        });

        const stats = {
            total: lines.length,
            present: lines.filter(l => l.status === 'PRESENT').length,
            absent: lines.filter(l => l.status === 'ABSENT').length,
            damaged: lines.filter(l => l.status === 'ENDOMMAGE').length,
            transferred: lines.filter(l => l.status === 'TRANSFERE').length,
        };

        return NextResponse.json({ lines, stats });
    } catch (error) {
        console.error('GET /api/inventory/[id]/lines error:', error);
        return NextResponse.json(
            { error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
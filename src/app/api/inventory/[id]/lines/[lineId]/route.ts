import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; lineId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Non authentifie' },
                { status: 401 }
            );
        }

        const { id: sessionId, lineId } = await params;
        const body = await request.json();
        const { status } = body;

        if (!status) {
            return NextResponse.json(
                { error: 'Le statut est requis' },
                { status: 400 }
            );
        }

        // Verifier les statuts valides
        const validStatuses = ['PRESENT', 'ABSENT', 'ENDOMMAGE', 'TRANSFERE'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Statut invalide' },
                { status: 400 }
            );
        }

        // Verifier que la session existe
        const sessionExists = await prisma.inventorySession.findUnique({
            where: { id: sessionId },
            select: { status: true },
        });

        if (!sessionExists) {
            return NextResponse.json(
                { error: 'Session non trouvee' },
                { status: 404 }
            );
        }

        if (sessionExists.status !== 'EN_COURS') {
            return NextResponse.json(
                { error: 'La session doit etre en cours pour modifier des lignes' },
                { status: 400 }
            );
        }

        // Mettre a jour la ligne
        const updatedLine = await prisma.inventoryLine.update({
            where: {
                id: lineId,
                sessionId: sessionId,
            },
            data: {
                status: status,
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

        return NextResponse.json(updatedLine);

    } catch (error: unknown) {
        console.error('PUT /api/inventory/[id]/lines/[lineId] error:', error);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return NextResponse.json(
                    {
                        error: 'Non trouve',
                        details: 'La ligne d\'inventaire n\'existe pas.',
                    },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json(
            { error: 'Erreur lors de la mise a jour' },
            { status: 500 }
        );
    }
}
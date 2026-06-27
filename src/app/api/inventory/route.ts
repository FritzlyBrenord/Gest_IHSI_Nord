import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

import { Prisma } from '@prisma/client';

export async function GET() {
    try {
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
            { error: 'Erreur lors de la récupération des sessions' },
            { status: 500 }
        );
    }
}


export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.employerId) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const body = await request.json();
        const title = String(body?.title ?? '').trim();
        const description = String(body?.description ?? '').trim();

        if (!title) {
            return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 });
        }

        const sessionUserId = session.user.employerId;

        // Simplified and more direct resolution for creatorEmployeeId
        const creatorEmployee = await prisma.employer.findUnique({
            where: { id: sessionUserId },
            select: { id: true, isActive: true }, // Select isActive to ensure the employee is active
        });

        if (!creatorEmployee || !creatorEmployee.isActive) {
            return NextResponse.json(
                { error: 'Le compte administrateur n’est pas lié à un employé actif ou valide.' },
                { status: 400 }
            );
        }

        const creatorEmployeeId = creatorEmployee.id;

        const createdSession = await prisma.inventorySession.create({
            data: {
                title,
                description: description || null,
                createdById: creatorEmployeeId,
                status: 'BROUILLON',
            },
        });

        return NextResponse.json(createdSession, { status: 201 });
    } catch (error: unknown) {
        console.error('POST /api/inventory error', error);

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2003'
        ) {
            // This error should now be less likely if the creatorEmployeeId resolution is correct
            return NextResponse.json(
                { error: 'Créateur invalide : le compte connecté n’est pas relié à un employé existant.' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Erreur lors de la création de la session' },
            { status: 500 }
        );
    }
}
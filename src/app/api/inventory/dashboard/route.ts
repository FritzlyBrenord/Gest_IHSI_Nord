import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const [materials, sessions] = await Promise.all([
            prisma.material.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            }),
            prisma.inventorySession.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    lines: true,
                },
            }),
        ]);

        const totalMaterials = materials.length;
        const goodMaterials = materials.filter((m) => m.condition === 'BON_ETAT').length;
        const toCheck = materials.filter((m) => m.condition === 'A_REPARER' || m.condition === 'ENDOMMAGE').length;
        const finishedSessions = sessions.filter((s) => s.status === 'TERMINE').length;

        return NextResponse.json({
            stats: {
                totalMaterials,
                goodMaterials,
                toCheck,
                finishedSessions,
            },
            materials,
            sessions,
        });
    } catch (error) {
        console.error('GET /api/inventory/dashboard error', error);
        return NextResponse.json(
            { error: 'Impossible de charger le tableau de bord inventaire' },
            { status: 500 }
        );
    }
}
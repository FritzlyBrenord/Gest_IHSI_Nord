
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const items = await prisma.material.findMany({
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
        });

        return NextResponse.json({ items });
    } catch (error) {
        console.error('GET /api/inventory/items error', error);
        return NextResponse.json(
            { error: 'Impossible de charger les matériels' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

type Context = {
    params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Context) {
    try {
        const { id } = await params;

        const session = await prisma.inventorySession.findUnique({
            where: { id },
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

        if (!session) {
            return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
        }

        return NextResponse.json(session);
    } catch (error) {
        console.error('GET inventory session error', error);
        return NextResponse.json(
            { error: 'Erreur lors de la récupération' },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest, { params }: Context) {
    try {
        const session = await auth();
        if (!session?.user?.employerId) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        const data: Record<string, unknown> = {};

        if (body.title !== undefined) data.title = String(body.title).trim();
        if (body.description !== undefined) {
            const desc = String(body.description).trim();
            data.description = desc || null;
        }
        if (body.status !== undefined) {
            data.status = body.status;
            if (body.status === 'EN_COURS') data.startedAt = new Date();
            if (body.status === 'TERMINE') data.endedAt = new Date();
        }

        const updated = await prisma.inventorySession.update({
            where: { id },
            data,
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('PUT inventory session error', error);
        return NextResponse.json(
            { error: 'Erreur lors de la mise à jour' },
            { status: 500 }
        );
    }
}

export async function DELETE(_req: Request, { params }: Context) {
    try {
        const session = await auth();
        if (!session?.user?.employerId) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { id } = await params;

        await prisma.inventorySession.delete({
            where: { id },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('DELETE inventory session error', error);
        return NextResponse.json(
            { error: 'Erreur lors de la suppression' },
            { status: 500 }
        );
    }
}
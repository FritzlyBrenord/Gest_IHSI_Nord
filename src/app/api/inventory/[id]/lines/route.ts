import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

type Context = {
    params: Promise<{ id: string }>;
};

type InventoryLineStatus = 'PRESENT' | 'ABSENT' | 'ENDOMMAGE' | 'TRANSFERE';

const ALLOWED_STATUSES = new Set<InventoryLineStatus>([
    'PRESENT',
    'ABSENT',
    'ENDOMMAGE',
    'TRANSFERE',
]);

function normalizeStatus(value: unknown): InventoryLineStatus | null {
    if (typeof value !== 'string') return null;
    return ALLOWED_STATUSES.has(value as InventoryLineStatus)
        ? (value as InventoryLineStatus)
        : null;
}

export async function POST(req: NextRequest, { params }: Context) {
    try {
        const session = await auth();
        if (!session?.user?.employerId) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { id: sessionId } = await params;
        const body = await req.json().catch(() => ({}));
        const materialIds = Array.isArray(body?.materialIds) ? body.materialIds : [];

        if (materialIds.length === 0) {
            return NextResponse.json(
                { error: 'Au moins un matériel est requis' },
                { status: 400 }
            );
        }

        const sessionData = await prisma.inventorySession.findUnique({
            where: { id: sessionId },
            select: { id: true },
        });

        if (!sessionData) {
            return NextResponse.json(
                { error: 'Session introuvable' },
                { status: 404 }
            );
        }

        const lines: unknown[] = [];

        for (const rawMaterialId of materialIds) {
            const materialId = String(rawMaterialId || '').trim();
            if (!materialId) continue;

            const exists = await prisma.inventoryLine.findFirst({
                where: {
                    sessionId,
                    materialId,
                },
            });

            if (exists) continue;

            const line = await prisma.inventoryLine.create({
                data: {
                    sessionId,
                    materialId,
                    status: 'PRESENT',
                    checkedById: session.user.employerId,
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

            lines.push(line);
        }

        return NextResponse.json({ lines }, { status: 201 });
    } catch (error) {
        console.error('POST inventory lines error', error);
        return NextResponse.json(
            { error: 'Erreur lors de l’ajout de matériels' },
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

        await params;
        const body = await req.json().catch(() => ({}));

        const lineId = typeof body?.lineId === 'string' ? body.lineId.trim() : '';
        const status = normalizeStatus(body?.status);
        const note = typeof body?.note === 'string' ? body.note.trim() : undefined;

        if (!lineId) {
            return NextResponse.json(
                { error: 'lineId est requis' },
                { status: 400 }
            );
        }

        if (!status) {
            return NextResponse.json(
                { error: 'Statut invalide' },
                { status: 400 }
            );
        }

        const updated = await prisma.inventoryLine.update({
            where: { id: lineId },
            data: {
                status,
                note: note ? note : null,
                checkedById: session.user.employerId,
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

        return NextResponse.json(updated);
    } catch (error) {
        console.error('PUT inventory line error', error);
        return NextResponse.json(
            { error: 'Erreur lors de la mise à jour de la ligne' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest, { params }: Context) {
    try {
        const session = await auth();
        if (!session?.user?.employerId) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        await params;
        const body = await req.json().catch(() => ({}));
        const lineId = typeof body?.lineId === 'string' ? body.lineId.trim() : '';

        if (!lineId) {
            return NextResponse.json(
                { error: 'lineId est requis' },
                { status: 400 }
            );
        }

        await prisma.inventoryLine.delete({
            where: { id: lineId },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('DELETE inventory line error', error);
        return NextResponse.json(
            { error: 'Erreur lors de la suppression' },
            { status: 500 }
        );
    }
}
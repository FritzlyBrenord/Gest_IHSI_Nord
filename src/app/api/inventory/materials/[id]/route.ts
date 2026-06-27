import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Context = {
    params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Context) {
    try {
        const { id } = await params;

        const material = await prisma.material.findUnique({
            where: { id },
            include: {
                assignedTo: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        if (!material) {
            return NextResponse.json({ error: 'Material not found' }, { status: 404 });
        }

        return NextResponse.json(material);
    } catch (err) {
        console.error('GET material by id error', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: Context) {
    try {
        const { id } = await params;
        const body = await req.json();

        const updated = await prisma.material.update({
            where: { id },
            data: {
                name: body.name,
                category: body.category,
                inventoryCode: body.inventoryCode,
                serialNumber: body.serialNumber ?? null,
                brand: body.brand ?? null,
                model: body.model ?? null,
                condition: body.condition ?? undefined,
                location: body.location ?? null,
                assignedToId: body.assignedToId ?? null,
                purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
                notes: body.notes ?? null,
            },
        });

        return NextResponse.json(updated);
    } catch (err) {
        console.error('PUT material error', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: Context) {
    try {
        const { id } = await params;

        await prisma.material.delete({
            where: { id },
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('DELETE material error', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
// src/app/api/inventory/materials/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const materials = await prisma.material.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                assignedTo: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
        return NextResponse.json(materials);
    } catch (err) {
        console.error('GET /api/inventory/materials error', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            name,
            category,
            inventoryCode,
            serialNumber,
            brand,
            model,
            condition,
            location,
            assignedToId,
            purchaseDate,
            notes,
        } = body;

        if (!name || !inventoryCode || !category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const material = await prisma.material.create({
            data: {
                name,
                category,
                inventoryCode,
                serialNumber: serialNumber ?? null,
                brand: brand ?? null,
                model: model ?? null,
                condition: condition ?? undefined,
                location: location ?? null,
                assignedToId: assignedToId ?? null,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
                notes: notes ?? null,
            },
        });

        return NextResponse.json(material, { status: 201 });
    } catch (err) {
        console.error('POST /api/inventory/materials error', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
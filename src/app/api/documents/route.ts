// src/app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseDocumentDate } from '@/lib/document-date';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const employerId = session.user.employerId;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = employerId === 'super-admin-id' ? {} : { employerId };

    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { preview: { contains: search, mode: 'insensitive' } },
        { variant: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          employer: {
            select: {
              firstName: true,
              lastName: true,
              poste: true,
              department: true
            }
          }
        }
      }),
      prisma.document.count({ where })
    ]);

    return NextResponse.json({
      documents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('Erreur GET /api/documents:', message);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const employerId = session.user.employerId;
    if (!employerId || employerId === 'super-admin-id') {
      return NextResponse.json(
        { error: 'Le super-admin doit utiliser un compte employé normal pour créer des documents' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      type,
      variant,
      content,
      preview,
      status = 'brouillon',
      workflowStatus = 'en_attente',
      visibility = 'prive',
      meetingId,
      recipientName,
      recipientRole,
      recipientOrg,
      senderName,
      senderAddress,
      documentDate,
      tags = [],
      category,
      isTemplate = false
    } = body;

    if (!title || !type || !variant || !content) {
      return NextResponse.json(
        { error: 'Titre, type, variante et contenu sont requis' },
        { status: 400 }
      );
    }

    const parsedDocumentDate = parseDocumentDate(documentDate);

    const document = await prisma.document.create({
      data: {
        title,
        type,
        variant,
        content,
        preview: preview || content.substring(0, 200),
        status,
        workflowStatus,
        visibility,
        meetingId,
        employerId,
        recipientName,
        recipientRole,
        recipientOrg,
        senderName,
        senderAddress,
        ...(parsedDocumentDate ? { documentDate: parsedDocumentDate } : {}),
        tags,
        category,
        isTemplate
      },
      include: {
        employer: {
          select: {
            firstName: true,
            lastName: true,
            poste: true,
            department: true
          }
        }
      }
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('Erreur POST /api/documents:', err?.message, err?.code);
    if (err?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Compte employé introuvable — veuillez vous reconnecter' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err?.message || 'Erreur lors de la création du document' },
      { status: 500 }
    );
  }
}

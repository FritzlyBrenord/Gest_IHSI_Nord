import { unlink } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'training-documents');

// GET - Récupérer un document de formation
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await prisma.trainingDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Erreur GET /api/training-documents/[id]:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération du document' }, { status: 500 });
  }
}

// PUT - Mettre à jour un document de formation
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, url } = body;

    const document = await prisma.trainingDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 });
    }

    // Si une nouvelle URL est fournie, supprimer l'ancien fichier
    if (url && url !== document.url) {
      const oldFileName = document.url.split('/').pop();
      if (oldFileName) {
        const oldFilePath = path.join(UPLOAD_DIR, oldFileName);
        try {
          await unlink(oldFilePath);
        } catch (err) {
          console.warn('Impossible de supprimer l\'ancien fichier:', err);
        }
      }
    }

    const updatedDocument = await prisma.trainingDocument.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(url && { url }),
      },
    });

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('Erreur PUT /api/training-documents/[id]:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du document' }, { status: 500 });
  }
}

// DELETE - Supprimer un document de formation
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await prisma.trainingDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 });
    }

    // Supprimer le fichier physique
    const fileName = document.url.split('/').pop();
    if (fileName) {
      const filePath = path.join(UPLOAD_DIR, fileName);
      try {
        await unlink(filePath);
      } catch (err) {
        console.warn('Impossible de supprimer le fichier physique:', err);
      }
    }

    // Supprimer l'enregistrement de la base de données
    await prisma.trainingDocument.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Document supprimé avec succès' });
  } catch (error) {
    console.error('Erreur DELETE /api/training-documents/[id]:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression du document' }, { status: 500 });
  }
}

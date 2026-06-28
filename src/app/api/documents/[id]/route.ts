// src/app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseDocumentDate } from '@/lib/document-date';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            poste: true,
            department: true,
            email: true
          }
        }
      }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 });
    }

    const employerId = session.user.employerId;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR', 'SECRETAIRE'].includes(session.user.role);
    
    // Vérifier si le document est partagé avec l'utilisateur
    const share = await (prisma as any).documentShare.findUnique({
      where: {
        documentId_sharedWithId: {
          documentId: documentId,
          sharedWithId: employerId,
        },
      },
    });

    console.log('Document Auth Check:', { 
      docId: documentId, 
      docEmployerId: document.employerId, 
      sessionEmployerId: employerId, 
      role: session.user.role, 
      visibility: document.visibility,
      hasShare: !!share
    });

    if (document.employerId !== employerId && !isAdmin && document.visibility !== 'public' && !share) {
      return NextResponse.json({ error: 'Accès non autorisé à ce document' }, { status: 403 });
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { viewCount: { increment: 1 } }
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Erreur GET /api/documents/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du document' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      content,
      preview,
      status,
      workflowStatus,
      visibility,
      reviewComment,
      recipientName,
      recipientRole,
      recipientOrg,
      senderName,
      senderAddress,
      documentDate,
      tags,
      category,
      isTemplate
    } = body;

    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    const existingDoc = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!existingDoc) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 });
    }

    const employerId = session.user.employerId;
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';

    if (existingDoc.employerId !== employerId && !isAdmin) {
      return NextResponse.json({ error: 'Accès non autorisé à ce document' }, { status: 403 });
    }

    const version = content && content !== existingDoc.content
      ? existingDoc.version + 1
      : existingDoc.version;

    let nextDocumentDate = existingDoc.documentDate;
    if (documentDate !== undefined) {
      if (documentDate === null || documentDate === '') {
        nextDocumentDate = null;
      } else {
        const parsedDocumentDate = parseDocumentDate(documentDate);
        nextDocumentDate = parsedDocumentDate ?? existingDoc.documentDate;
      }
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(preview !== undefined && { preview: preview || content?.substring(0, 200) }),
        ...(status !== undefined && { status }),
        ...(workflowStatus !== undefined && { workflowStatus }),
        ...(visibility !== undefined && { visibility }),
        ...(reviewComment !== undefined && { reviewComment }),
        ...(recipientName !== undefined && { recipientName }),
        ...(recipientRole !== undefined && { recipientRole }),
        ...(recipientOrg !== undefined && { recipientOrg }),
        ...(senderName !== undefined && { senderName }),
        ...(senderAddress !== undefined && { senderAddress }),
        ...(documentDate !== undefined && { documentDate: nextDocumentDate }),
        ...(tags !== undefined && { tags }),
        ...(category !== undefined && { category }),
        ...(isTemplate !== undefined && { isTemplate }),
        version
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erreur PUT /api/documents/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 });
    }

    const employerId = session.user.employerId;
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';

    if (document.employerId !== employerId && !isAdmin) {
      return NextResponse.json({ error: 'Accès non autorisé à ce document' }, { status: 403 });
    }

    await prisma.document.delete({ where: { id: documentId } });

    return NextResponse.json({ message: 'Document supprimé avec succès' });
  } catch (error) {
    console.error('Erreur DELETE /api/documents/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du document' },
      { status: 500 }
    );
  }
}

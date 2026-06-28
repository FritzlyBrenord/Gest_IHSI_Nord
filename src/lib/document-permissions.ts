import { prisma } from '@/lib/prisma';
import type { DocumentPermission } from '@/types/document';

// Type étendu pour inclure la relation shares (nécessaire car Prisma client peut ne pas être à jour)
type DocumentWithShares = any;

export interface DocumentAccessResult {
  hasAccess: boolean;
  permission?: DocumentPermission;
  reason?: string;
}

/**
 * Vérifie si un utilisateur a accès à un document et avec quelle permission
 */
export async function checkDocumentAccess(
  documentId: string,
  employerId: string
): Promise<DocumentAccessResult> {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        visibility: true,
        employerId: true,
      },
    }) as any;

    if (!document) {
      return { hasAccess: false, reason: 'Document non trouvé' };
    }

    // Récupérer les partages séparément
    const shares = await (prisma as any).documentShare.findMany({
      where: {
        documentId,
        sharedWithId: employerId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      select: {
        permission: true,
      },
    });

    // Le propriétaire a toujours accès complet
    if (document.employerId === employerId) {
      return { hasAccess: true, permission: 'write' };
    }

    // Document public
    if (document.visibility === 'public') {
      return { hasAccess: true, permission: 'read' };
    }

    // Document privé
    if (document.visibility === 'prive') {
      return { hasAccess: false, reason: 'Document privé' };
    }

    // Document partagé
    if (document.visibility === 'partage') {
      const share = shares[0] as { permission: string } | undefined;
      if (share) {
        return { hasAccess: true, permission: share.permission as DocumentPermission };
      }
      return { hasAccess: false, reason: 'Non partagé avec cet utilisateur' };
    }

    return { hasAccess: false, reason: 'Visibilité inconnue' };
  } catch (error) {
    console.error('Erreur checkDocumentAccess:', error);
    return { hasAccess: false, reason: 'Erreur serveur' };
  }
}

/**
 * Vérifie si un utilisateur peut modifier un document
 */
export async function canEditDocument(
  documentId: string,
  employerId: string
): Promise<boolean> {
  const access = await checkDocumentAccess(documentId, employerId);
  return access.hasAccess && access.permission === 'write';
}

/**
 * Récupère tous les documents accessibles par un utilisateur
 */
export async function getAccessibleDocuments(employerId: string) {
  try {
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          // Documents créés par l'utilisateur
          { employerId },
          // Documents publics
          { visibility: 'public' },
          // Documents partagés avec l'utilisateur (requête séparée)
        ],
      },
      include: {
        employer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }) as any[];

    // Récupérer les partages pour tous les documents
    const documentIds = documents.map(d => d.id);
    const shares = await (prisma as any).documentShare.findMany({
      where: {
        documentId: { in: documentIds },
        sharedWithId: employerId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      select: {
        documentId: true,
        permission: true,
      },
    });

    // Créer un map des partages par documentId
    const sharesMap = new Map<string, string>();
    shares.forEach((share: any) => {
      sharesMap.set(share.documentId, share.permission);
    });

    // Filtrer les documents partagés et ajouter les permissions
    const accessibleDocuments = documents.filter((doc: any) => {
      if (doc.employerId === employerId) return true;
      if (doc.visibility === 'public') return true;
      if (doc.visibility === 'partage' && sharesMap.has(doc.id)) return true;
      return false;
    });

    return accessibleDocuments.map((doc: any) => ({
      ...doc,
      accessPermission: doc.employerId === employerId 
        ? 'write' 
        : doc.visibility === 'public' 
          ? 'read' 
          : sharesMap.get(doc.id) || 'read',
    }));
  } catch (error) {
    console.error('Erreur getAccessibleDocuments:', error);
    return [];
  }
}

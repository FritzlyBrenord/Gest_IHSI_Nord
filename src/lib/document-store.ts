import { DocumentItem } from "@/types/document";

type DocumentCreatePayload = Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt'> & {
  employerId?: string;
  employer?: unknown;
};

export async function fetchDocuments(): Promise<DocumentItem[]> {
  try {
    const res = await fetch('/api/documents');
    if (!res.ok) throw new Error("Erreur lors de la récupération des documents");
    const data = await res.json();
    return data.documents || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getDocument(id: string): Promise<DocumentItem | null> {
  try {
    const res = await fetch(`/api/documents/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function readErrorMessage(res: Response) {
  try {
    const payload = await res.json();
    return payload?.error || `Erreur serveur ${res.status}`;
  } catch {
    return `Erreur serveur ${res.status}`;
  }
}

export async function createDocument(docData: unknown): Promise<DocumentItem | null> {
  try {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData)
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res));
    }
    return await res.json();
  } catch (error) {
    console.error('createDocument error:', error);
    throw error;
  }
}

export async function updateDocument(id: string, docData: unknown): Promise<DocumentItem | null> {
  try {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData)
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res));
    }
    return await res.json();
  } catch (error) {
    console.error('updateDocument error:', error);
    throw error;
  }
}

export async function removeDocument(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Erreur lors de la suppression du document");
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function duplicateDocument(id: string): Promise<DocumentItem | null> {
  try {
    const doc = await getDocument(id);
    if (!doc) return null;

    const duplicateData: DocumentCreatePayload = {
      title: `${doc.title} (copie)`,
      type: doc.type,
      variant: doc.variant,
      content: doc.content,
      preview: doc.preview,
      workflowStatus: doc.workflowStatus,
      visibility: doc.visibility,
      meetingId: doc.meetingId,
      reviewComment: doc.reviewComment,
    };

    return await createDocument(duplicateData);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function stripPreviewMetadata(content: string) {
  return content
    .replace(/\[\[(?:header:(?:true|false)|place:[^\]]*|date:[^\]]*|.*?)]\]/gi, " ")
    .replace(/\[\[(.*?)\]\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function generatePreview(content: string): string {
  const cleaned = stripPreviewMetadata(content);
  if (!cleaned) return "";

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (sentences.length > 0 ? sentences : [cleaned])
    .join(" ")
    .substring(0, 180);
}


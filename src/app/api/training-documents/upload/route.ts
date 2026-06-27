import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'training-documents');

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function buildPublicUrl(fileName: string) {
  return `/uploads/training-documents/${fileName}`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const incomingFiles = formData.getAll('files').filter((entry): entry is File => entry instanceof File);

    if (incomingFiles.length === 0) {
      return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const documents = await Promise.all(
      incomingFiles.map(async (file) => {
        const originalName = file.name || 'document';
        const safeName = sanitizeFileName(originalName) || 'document';
        const uniqueName = `${Date.now()}-${randomUUID()}-${safeName}`;
        const filePath = path.join(UPLOAD_DIR, uniqueName);
        const buffer = Buffer.from(await file.arrayBuffer());

        await writeFile(filePath, buffer);

        const url = buildPublicUrl(uniqueName);
        return {
          id: randomUUID(),
          key: uniqueName,
          url,
          appUrl: url,
          ufsUrl: url,
          name: originalName,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          uploadedAt: new Date().toISOString(),
        };
      })
    );

    return NextResponse.json({ documents }, { status: 201 });
  } catch (error) {
    console.error('Erreur POST /api/training-documents/upload:', error);
    return NextResponse.json({ error: 'Erreur lors du téléversement des documents' }, { status: 500 });
  }
}

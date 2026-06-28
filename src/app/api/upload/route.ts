import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');

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
  return `/uploads/documents/${fileName}`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
    }

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 });
    }

    // Vérifier la taille (max 8MB)
    const maxSize = 8 * 1024 * 1024; // 8MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'L\'image ne doit pas dépasser 8MB' }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const originalName = file.name || 'image';
    const safeName = sanitizeFileName(originalName) || 'image';
    const uniqueName = `${Date.now()}-${randomUUID()}-${safeName}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filePath, buffer);

    const url = buildPublicUrl(uniqueName);
    return NextResponse.json({ 
      url,
      name: originalName,
      size: file.size,
    }, { status: 201 });
  } catch (error) {
    console.error('Erreur POST /api/upload:', error);
    return NextResponse.json({ error: 'Erreur lors du téléversement de l\'image' }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { generateWithGemini } from "@/lib/gemini";
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { content, instruction, type, variant, title, scope, letterClosing, letterSalutation } = await request.json();

    if (!content || !instruction) {
      return NextResponse.json({ error: "Contenu et instruction requis" }, { status: 400 });
    }

    const baseInstruction =
      "Vous êtes un assistant IA expert en rédaction de documents administratifs professionnels en français. " +
      "Améliorez, corrigez ou modifiez le texte fourni selon les instructions exactes de l'utilisateur. " +
      "Gardez le même format (Markdown) et ne retournez QUE le texte modifié, sans explications et sans balises de code markdown (```).";

    const prompt = 
      `Document original (Type: ${type}, Variante: ${variant}, Titre: ${title || "Non spécifié"}):\n\n` +
      `${content}\n\n` +
      `INSTRUCTION DE L'UTILISATEUR :\n${instruction}\n\n` +
      `Appliquez strictement l'instruction ci-dessus sur le document original et retournez le résultat complet.`;

    const improvedContent = await generateWithGemini(prompt, baseInstruction);

    return NextResponse.json({ content: improvedContent });
  } catch (error: any) {
    console.error("Improve API Error:", error);
    return NextResponse.json(
      { error: error.message || "Une erreur est survenue lors de l'amélioration du document" },
      { status: 500 }
    );
  }
}


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
      "Vous êtes un expert en rédaction de documents administratifs " +
      "officiels pour l'IHSI (Institut Haïtien de Statistique et " +
      "d'Informatique), Direction Nord.\n\n" +
      "Votre rôle est d'appliquer EXACTEMENT l'instruction de l'utilisateur " +
      "sur le document fourni, tout en préservant :\n" +
      "- Le format Markdown existant (## pour les titres, ** pour le gras)\n" +
      "- Les délimiteurs de page ---PAGE--- s'ils existent\n" +
      "- La structure générale du document (sections, ordre)\n" +
      "- Le ton formel et institutionnel haïtien\n\n" +
      "INTERDICTIONS :\n" +
      "- Ne retournez QUE le texte modifié, sans explications.\n" +
      "- N'ajoutez pas de balises de code markdown (```).\n" +
      "- Ne supprimez pas les sections existantes sauf si " +
      "  l'instruction le demande explicitement.\n" +
      "- Ne résumez pas le document sauf si l'instruction le demande.\n" +
      "- Ne changez pas la langue (restez en français formel).";

    const prompt = 
      `Type de document : ${type}\n` +
      `Variante : ${variant}\n` + 
      `Titre : ${title || 'Non spécifié'}\n` +
      `Portée de la modification : ${scope === 'body' ? 
        'Corps de la lettre uniquement' : 
        'Document complet'}\n\n` +
      `CONTENU ORIGINAL À MODIFIER :\n${content}\n\n` +
      `INSTRUCTION DE L'UTILISATEUR :\n${instruction}\n\n` +
      `Appliquez strictement et uniquement l'instruction ci-dessus.\n` +
      `Retournez le document complet modifié en Markdown.`;

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


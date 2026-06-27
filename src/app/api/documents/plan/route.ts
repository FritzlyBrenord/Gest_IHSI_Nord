import { NextResponse } from "next/server";
import { generateWithGemini } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const { type, variant, title, description, keyPoints, pageCount } = await request.json();

    let prompt = "";
    if (type === "compterendu") {
      prompt = `Générez un plan détaillé (sommaire) pour un compte rendu de type "${variant}".
Titre: ${title}
Description: ${description}
Points: ${keyPoints?.map((k: any) => k.title).join(", ")}
Formattez le plan sous forme de liste Markdown simple.`;
    } else {
      prompt = `Générez un plan détaillé (sommaire) pour un rapport de type "${variant}".
Titre: ${title}
Description: ${description}
Formattez le plan sous forme de liste Markdown simple avec des titres (##).`;
    }

    const content = await generateWithGemini(prompt);

    return NextResponse.json({ plan: content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

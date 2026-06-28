import { NextResponse } from "next/server";
import { generateWithGemini } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const { type, variant, title, description, keyPoints, pageCount } = await request.json();

    let prompt = "";
    if (type === "compterendu") {
      prompt = `Vous êtes expert en rédaction administrative pour l'IHSI Haïti.

Générez un plan structuré et détaillé pour un compte rendu 
de type '${variant}'.

INFORMATIONS :
- Titre : ${title}
- Contexte : ${description}
- Points à couvrir : ${keyPoints?.map((k: any) => k.title).join(', ')}
- Nombre de pages cible : ${pageCount || 2}

FORMAT DE RÉPONSE ATTENDU (liste Markdown) :
## Plan du compte rendu

1. **Contexte et objectifs**
   - [sous-point précis lié au contexte fourni]
   - [sous-point précis]

2. **Déroulement**
   - [un sous-point par point de la liste fournie]

3. **Résultats et acquis**
   - [sous-point lié aux résultats attendus]

4. **Recommandations et perspectives**
   - [actions concrètes à suivre]

5. **Conclusion**
   - [clôture institutionnelle]

RÈGLES :
- Chaque sous-point doit être spécifique au contexte fourni.
- Ne mettez pas de texte générique comme '[contenu]'.
- Maximum 5 sections principales pour un compte rendu.
- Répondez UNIQUEMENT avec le plan en Markdown, sans explication.`;
    } else {
      prompt = `Vous êtes expert en rédaction administrative pour l'IHSI Haïti.

Générez un plan structuré et détaillé pour un rapport 
de type '${variant}'.

INFORMATIONS :
- Titre : ${title}
- Description : ${description}
- Points à traiter : ${keyPoints?.map((k: any) => k.title).join(', ')}
- Nombre de pages cible : ${pageCount || 5}

FORMAT DE RÉPONSE ATTENDU (Markdown) :
## Plan du rapport

### Page de couverture
- Titre, date, auteur, organisation

### Sommaire
1. Introduction
2. [Sections selon les points fournis]
N. Conclusion
[Annexes si pertinent]

### 1. Introduction
- Contexte général
- Objectifs du rapport
- Méthodologie

### 2. [Section liée au point 1 fourni]
- [Sous-thème précis]
- [Sous-thème précis]
- [Données ou analyses attendues]

[Répéter pour chaque point fourni]

### Conclusion
- Synthèse
- Recommandations
- Perspectives

### Annexes (si pertinent)
- [Type de contenu annexe]

RÈGLES :
- Chaque section doit être directement liée aux points fournis.
- Ne mettez pas de texte générique comme '[contenu]'.
- Répondez UNIQUEMENT avec le plan en Markdown, sans explication.`;
    }

    const content = await generateWithGemini(prompt);

    return NextResponse.json({ plan: content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

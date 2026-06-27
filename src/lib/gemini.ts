import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateWithGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY n'est pas configurée");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const modelOptions: any = { model: "gemini-3.1-flash-lite" };
    if (systemInstruction) {
        modelOptions.systemInstruction = systemInstruction;
    }
    const model = genAI.getGenerativeModel(modelOptions);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Erreur génération Gemini:", error);
    throw new Error(error.message || "Échec de la génération par l'IA");
  }
}

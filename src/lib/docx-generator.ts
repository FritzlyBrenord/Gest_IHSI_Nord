import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';

// import ImageModule from 'docxtemplater-image-module-free'; // Décommenter si gestion des images

/**
 * Charge un template DOCX et y injecte les données.
 * 
 * @param templatePath Le chemin absolu vers le fichier .docx de template
 * @param data Les données clé-valeur à injecter dans le template
 * @returns Le document généré sous forme de Buffer
 */
export async function generateDocx(templatePath: string, data: Record<string, any>): Promise<Buffer> {
  try {
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template introuvable: ${templatePath}`);
    }

    // Lire le fichier template
    const content = fs.readFileSync(templatePath, 'binary');

    // Initialiser PizZip
    const zip = new PizZip(content);

    // Initialiser docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      // modules: [new ImageModule({...})] // Ajouter la configuration d'images ici si nécessaire
    });

    // Injecter les données
    doc.render(data);

    // Générer le buffer
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    return buffer;
  } catch (error) {
    console.error('Erreur dans generateDocx :', error);
    throw error;
  }
}

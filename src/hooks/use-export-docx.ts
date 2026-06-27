import { useState } from 'react';
import { saveAs } from 'file-saver';

interface ExportDocxParams {
  type: 'letters' | 'reports' | 'minutes' | string;
  variant: string;
  data: Record<string, any>;
  filename?: string;
}

export function useExportDocx() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportDocx = async ({ type, variant, data, filename }: ExportDocxParams) => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch('/api/export-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, variant, data }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du document');
      }

      const blob = await response.blob();
      
      // Si aucun nom de fichier n'est fourni, on utilise le type et la variante
      const downloadFilename = filename || `${type}_${variant}.docx`;
      saveAs(blob, downloadFilename);
      
    } catch (err) {
      console.error('Erreur hook useExportDocx:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err; // Relancer l'erreur si le composant parent veut l'attraper
    } finally {
      setIsExporting(false);
    }
  };

  return { exportDocx, isExporting, error };
}

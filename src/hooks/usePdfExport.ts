'use client';

import { useState, useRef, useCallback } from 'react';

interface UsePdfExportOptions {
  filename?: string;
  title?: string;
}

export function usePdfExport({ filename = 'document', title }: UsePdfExportOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const downloadPdf = useCallback(() => {
    if (!contentRef.current) return;
    setIsGenerating(true);

    // Capture the inner HTML of the document preview zone
    const content = contentRef.current.innerHTML;
    const docTitle = title || filename;

    // Open a clean print window with all necessary styles
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setIsGenerating(false);
      alert('Veuillez autoriser les popups pour télécharger le PDF.');
      return;
    }

    // Gather all stylesheets from the current page
    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((link) => link.outerHTML)
      .join('\n');

    const inlineStyles = Array.from(document.querySelectorAll('style'))
      .map((s) => `<style>${s.innerHTML}</style>`)
      .join('\n');

    printWindow.document.write(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${docTitle}</title>
  ${styleLinks}
  ${inlineStyles}
  <style>
    /* Force print-friendly rendering */
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 0; background: white; font-family: 'Times New Roman', serif; }
    @page { size: A4; margin: 0; }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div style="display:flex;flex-direction:column;align-items:center;gap:32px;padding:0;background:#f5f5f5;">
    ${content}
  </div>
</body>
</html>
    `);
    printWindow.document.close();

    // Wait for fonts/images to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        // Close after print dialog (some browsers do this automatically)
        printWindow.onafterprint = () => {
          printWindow.close();
          setIsGenerating(false);
        };
        // Fallback timeout in case onafterprint doesn't fire
        setTimeout(() => setIsGenerating(false), 3000);
      }, 600);
    };

    // Safety fallback
    setTimeout(() => setIsGenerating(false), 8000);
  }, [filename, title]);

  const sharePdf = useCallback((method: 'whatsapp' | 'email' | 'native') => {
    // For sharing, we first trigger the print/download, then open the share target
    if (method === 'whatsapp') {
      // Download PDF first, then open WhatsApp
      downloadPdf();
      setTimeout(() => {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`Document: ${title || filename} — veuillez trouver le fichier PDF téléchargé.`)}`,
          '_blank'
        );
      }, 1500);
    } else if (method === 'email') {
      downloadPdf();
      setTimeout(() => {
        window.open(
          `mailto:?subject=${encodeURIComponent(title || filename)}&body=${encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint le document: "${title || filename}".\n\nCordialement`)}`,
          '_blank'
        );
      }, 1500);
    } else {
      // native share - use Web Share API if available, else print
      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({
          title: title || filename,
          text: `Document: ${title || filename}`,
        }).catch(() => downloadPdf());
      } else {
        downloadPdf();
      }
    }
  }, [filename, title, downloadPdf]);

  return { contentRef, isGenerating, downloadPdf, sharePdf };
}

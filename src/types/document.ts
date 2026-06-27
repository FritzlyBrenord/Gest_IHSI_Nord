export type DocumentType = "letter" | "compterendu" | "report";

export interface DocumentItem {
  id: string;
  title: string;
  type: DocumentType;
  variant: string;
  content: string;
  preview: string;
  workflowStatus?: 'en_attente' | 'a_corriger' | 'valide';
  visibility?: 'prive' | 'public';
  meetingId?: string | null;
  reviewComment?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVariant {
  id: string;
  label: string;
  description: string;
}

export interface DocumentTypeConfig {
  id: DocumentType;
  label: string;
  description: string;
  icon: string;
  variants: DocumentVariant[];
}

export const DOCUMENT_TYPES: DocumentTypeConfig[] = [
  {
    id: "letter",
    label: "Lettre",
    description: "Courriers administratifs et professionnels.",
    icon: "mail",
    variants: [
      { id: "administrative", label: "Lettre administrative", description: "Correspondance administrative" },
      { id: "autorisation", label: "Lettre d'autorisation", description: "Accorder une autorisation" },
    ],
  },
  {
    id: "compterendu",
    label: "Compte rendu",
    description: "Résumé structuré d'une activité ou réunion.",
    icon: "clipboard",
    variants: [
      { id: "reunion", label: "Réunion", description: "Compte rendu de réunion" },
      { id: "activite", label: "Activité", description: "Compte rendu d'activité" },
      { id: "mission", label: "Mission", description: "Compte rendu de mission" },
      { id: "formation", label: "Formation", description: "Compte rendu de formation" },
      { id: "evenement", label: "Événement", description: "Compte rendu d'événement" },
      { id: "projet", label: "Projet", description: "Compte rendu de projet" },
      { id: "visite", label: "Visite", description: "Compte rendu de visite" },
    ],
  },
  {
    id: "report",
    label: "Rapport",
    description: "Document détaillé avec analyses et recommandations.",
    icon: "file-text",
    variants: [
      { id: "activite", label: "Rapport d'activité", description: "Bilan des activités" },
      { id: "projet", label: "Rapport de projet", description: "Rapport sur un projet" },
      { id: "technique", label: "Rapport technique", description: "Rapport technique détaillé" },
      { id: "administratif", label: "Rapport administratif", description: "Rapport administratif" },
      { id: "financier", label: "Rapport financier", description: "Rapport financier" },
      { id: "mission", label: "Rapport de mission", description: "Rapport de mission" },
      { id: "enquete", label: "Rapport d'enquête", description: "Rapport d'enquête" },
      { id: "stage", label: "Rapport de stage", description: "Rapport de stage" },
      { id: "annuel", label: "Rapport annuel", description: "Bilan annuel" },
      { id: "mensuel", label: "Rapport mensuel", description: "Bilan mensuel" },
      { id: "statistique", label: "Rapport statistique", description: "Rapport statistique" },
      { id: "academique", label: "Rapport académique", description: "Rapport académique" },
      { id: "audit", label: "Rapport d'audit", description: "Rapport d'audit" },
      { id: "recherche", label: "Rapport de recherche", description: "Rapport de recherche" },
      { id: "evaluation", label: "Rapport d'évaluation", description: "Rapport d'évaluation" },
    ],
  },
];

export function getDocumentTypeConfig(typeId: DocumentType): DocumentTypeConfig | undefined {
  return DOCUMENT_TYPES.find((t) => t.id === typeId);
}

export function getVariantLabel(typeId: DocumentType, variantId: string): string {
  const config = getDocumentTypeConfig(typeId);
  return config?.variants.find((v) => v.id === variantId)?.label ?? variantId;
}


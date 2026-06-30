// ============================================================
// CONSTANTS — extraits de documents.tsx
// ============================================================

import { type Variants } from "framer-motion";

// ============================================================
// LETTER VARIANT GUIDES
// ============================================================

export const LETTER_VARIANT_GUIDES: Record<string, {
  label: string;
  subjectPlaceholder: string;
  bodyPlaceholder: string;
  hint: string;
  structure: string[];
  closing: string;
}> = {
  demande: {
    label: "Lettre de demande",
    subjectPlaceholder: "Ex: Demande d'autorisation d'absence",
    bodyPlaceholder: "Expliquez clairement la demande, le contexte et la date souhaitée.",
    hint: "Mettez l'objet de la demande dès le début et soyez direct.",
    structure: ["Contexte", "Demande précise", "Justification", "Formule de clôture"],
    closing: "Je vous prie d'agréer, Madame, Monsieur, l'expression de ma considération distinguée.",
  },
  administrative: {
    label: "Lettre administrative",
    subjectPlaceholder: "Ex: Demande de document administratif",
    bodyPlaceholder: "Rédigez une correspondance formelle avec un ton institutionnel.",
    hint: "Utilisez un ton sobre, institutionnel et précis.",
    structure: ["Référence", "Objet", "Demande", "Pièces jointes éventuelles"],
    closing: "Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
  },
  motivation: {
    label: "Lettre de motivation",
    subjectPlaceholder: "Ex: Candidature au poste de chargé de projet",
    bodyPlaceholder: "Présentez votre parcours, vos compétences et votre motivation.",
    hint: "Valorisez le poste visé, vos compétences et votre disponibilité.",
    structure: ["Poste visé", "Parcours", "Compétences", "Motivation", "Disponibilité"],
    closing: "Je vous prie d'agréer, Madame, Monsieur, l'expression de ma considération distinguée.",
  },
  reclamation: {
    label: "Lettre de réclamation",
    subjectPlaceholder: "Ex: Réclamation concernant un dossier en attente",
    bodyPlaceholder: "Décrivez le problème, la date, l'impact et l'action attendue.",
    hint: "Restez factuel et indiquez clairement la solution attendue.",
    structure: ["Fait constaté", "Date ou référence", "Impact", "Correction demandée"],
    closing: "Dans l'attente de votre retour, veuillez agréer, Madame, Monsieur, mes salutations distinguées.",
  },
  commerciale: {
    label: "Lettre commerciale",
    subjectPlaceholder: "Ex: Proposte de partenariat commercial",
    bodyPlaceholder: "Présentez l'offre, la valeur ajoutée et l'appel à l'action.",
    hint: "Insistez sur la proposte de valeur et la prochaine étape.",
    structure: ["Offre", "Avantage", "Bénéfice pour le destinataire", "Appel à l'action"],
    closing: "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
  },
  recommandation: {
    label: "Lettre de recommandation",
    subjectPlaceholder: "Ex: Recommandation de Mme X pour le poste Y",
    bodyPlaceholder: "Expliquez le contexte, la relation et les qualités recommandées.",
    hint: "Appuyez votre recommandation par des éléments concrets.",
    structure: ["Relation avec la personne", "Qualités observées", "Contexte", "Recommandation finale"],
    closing: "Je reste à votre disposte pour toute information complémentaire.",
  },
  partenariat: {
    label: "Lettre de partenariat",
    subjectPlaceholder: "Ex: Proposte de partenariat institutionnel",
    bodyPlaceholder: "Présentez la collaboration proposée et les bénéfices mutuels.",
    hint: "Montez la complémentarité entre les deux parties.",
    structure: ["Contexte", "Objectif du partenariat", "Bénéfices mutuels", "Prochaine étape"],
    closing: "Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
  },
  candidature: {
    label: "Lettre de candidature",
    subjectPlaceholder: "Ex: Candidature au poste de secrétaire administratif",
    bodyPlaceholder: "Présentez votre profil, votre expérience et votre intérêt pour le poste.",
    hint: "Reliez votre profil aux besoins du poste visé.",
    structure: ["Poste visé", "Profil", "Expérience", "Motivation", "Disponibilité"],
    closing: "Je vous prie d'agréer, Madame, Monsieur, l'expression de ma considération distinguée.",
  },
  demission: {
    label: "Lettre de démission",
    subjectPlaceholder: "Ex: Démission du poste de [fonction]",
    bodyPlaceholder: "Indiquez votre décision, la date de départ et le ton souhaité.",
    hint: "Annoncez la démission avec courtoisie et précisez la date de fin de contrat.",
    structure: ["Poste occupé", "Date de départ", "Motif éventuel", "Remerciements"],
    closing: "Je vous prie d'agréer, Madame, Monsieur, l'expression de ma considération distinguée.",
  },
  remerciement: {
    label: "Lettre de remerciement",
    subjectPlaceholder: "Ex: Remerciements pour votre soutien",
    bodyPlaceholder: "Exprimez votre gratitude et précisez le contexte.",
    hint: "Soyez chaleureux, direct et sincère.",
    structure: ["Contexte", "Remerciements", "Impact ou bénéfice", "Formule finale"],
    closing: "Je vous remercie encore et vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.",
  },
  officielle: {
    label: "Lettre officielle",
    subjectPlaceholder: "Ex: Communication officielle concernant [sujet]",
    bodyPlaceholder: "Rédigez une note formelle avec l'information ou la décision à transmettre.",
    hint: "Le ton doit rester institutionnel et précis.",
    structure: ["Référence", "Objet", "Décision ou information", "Suite attendue"],
    closing: "Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
  },
  autorisation: {
    label: "Lettre d'autorisation",
    subjectPlaceholder: "Ex: Autorisation de retrait de dossier",
    bodyPlaceholder: "Précisez qui est autorisé, pour quoi faire et sur quelle période.",
    hint: "Délimitez clairement le périmètre de l'autorisation.",
    structure: ["Personne autorisée", "Objet de l'autorisation", "Durée", "Limites ou conditions"],
    closing: "Je vous prie d'agréer, Madame, Monsieur, l'expression de ma considération distinguée.",
  },
};

// ============================================================
// ANIMATION VARIANTS
// ============================================================

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};
export const cardVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
  hover: { scale: 1.02, transition: { duration: 0.15 } },
};
export const stepVariants: Variants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
};

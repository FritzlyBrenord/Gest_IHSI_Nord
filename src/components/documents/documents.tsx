"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Plus, Search, FileText, Mail, ClipboardList, ChevronRight, ChevronLeft,
  Sparkles, Trash2, Copy, Download, Share2, Printer, Eye, Bold, Italic,
  Heading1, List, Table, Image as ImageIcon, Quote, ArrowLeft, MoreVertical, Loader2,
  X, Check, FileUp, MessageSquare, Send, PlusCircle, Minus, Code, Edit3,
  ThumbsUp, File, Calendar, Users, MapPin, Video, Monitor, UserCheck,
  UserX, Building2, Globe, ClipboardCheck,
} from "lucide-react";

import { fetchDocuments, createDocument, updateDocument, removeDocument, duplicateDocument, generatePreview } from "@/lib/document-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hook/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getVariantLabel, DocumentItem, DocumentType, DOCUMENT_TYPES, getDocumentTypeConfig } from "@/types/document";
import { OfficialHeader, buildOfficialHeaderHtml } from "@/components/documents/official-header";

// ============================================================
// TYPES
// ============================================================

type AppView = "dashboard" | "create" | "editor" | "event-compterendu";
type CreateStep = 1 | 2 | 3 | 4 | 5 | 6;

// ─── EventData : données passées depuis la page Événements ───────────────────

interface EventParticipantData {
  id: string;
  wasPresent: boolean;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    department: string;
  };
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  durationMins: number;
  type: 'PRESENTIEL' | 'EN_LIGNE' | 'HYBRIDE';
  category: 'REUNION' | 'FORMATION';
  location: string | null;
  platform: string | null;
  reportResponsible: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    department: string;
  } | null;
  participants: EventParticipantData[];
  status: string;
}

type HybridStatus = 'PRESENTIEL' | 'EN_LIGNE' | 'ABSENT';
type SimpleStatus = 'PRESENT' | 'ABSENT';
type ParticipantStatus = HybridStatus | SimpleStatus;

interface KeyPoint { id: string; title: string; description: string; }

interface LetterFields {
  place: string;
  date: string;
  senderName: string;
  senderAddress: string;
  senderPhone: string;
  senderEmail: string;
  recipientName: string;
  recipientRole: string;
  recipientOrganization: string;
  recipientAddress: string;
  subject: string;
  body: string;
  closing: string;
  signatureName: string;
}

// ============================================================
// LETTER VARIANT GUIDES
// ============================================================

const LETTER_VARIANT_GUIDES: Record<string, {
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
    subjectPlaceholder: "Ex: Proposition de partenariat commercial",
    bodyPlaceholder: "Présentez l'offre, la valeur ajoutée et l'appel à l'action.",
    hint: "Insistez sur la proposition de valeur et la prochaine étape.",
    structure: ["Offre", "Avantage", "Bénéfice pour le destinataire", "Appel à l'action"],
    closing: "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
  },
  recommandation: {
    label: "Lettre de recommandation",
    subjectPlaceholder: "Ex: Recommandation de Mme X pour le poste Y",
    bodyPlaceholder: "Expliquez le contexte, la relation et les qualités recommandées.",
    hint: "Appuyez votre recommandation par des éléments concrets.",
    structure: ["Relation avec la personne", "Qualités observées", "Contexte", "Recommandation finale"],
    closing: "Je reste à votre disposition pour toute information complémentaire.",
  },
  partenariat: {
    label: "Lettre de partenariat",
    subjectPlaceholder: "Ex: Proposition de partenariat institutionnel",
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

function getLetterGuide(variant: string | null) {
  return variant ? LETTER_VARIANT_GUIDES[variant] ?? null : null;
}

function parseDocumentDateInput(value: string | undefined | null) {
  if (!value) return undefined;
  const cleaned = value.trim();
  if (!cleaned) return undefined;

  const direct = new Date(cleaned);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  const normalized = cleaned
    .replace(/^.*?\b(?:le|du)\b\s+/i, '')
    .replace(/^[A-Za-zÀ-ÿ\-\s]+,\s*/u, '')
    .trim();

  const frenchMatch = normalized.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ\-]+)\s+(\d{4})$/u);
  if (frenchMatch) {
    const months: Record<string, number> = { janvier: 0, fevrier: 1, février: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6, aout: 7, août: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11, décembre: 11 };
    const monthKey = frenchMatch[2].normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const month = months[monthKey];
    if (month !== undefined) {
      const parsed = new Date(Number(frenchMatch[3]), month, Number(frenchMatch[1]));
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }

  return undefined;
}
function createDefaultLetterFields(): LetterFields {
  return {
    place: "",
    date: format(new Date(), "d MMMM yyyy", { locale: fr }),
    senderName: "", senderAddress: "", senderPhone: "", senderEmail: "",
    recipientName: "", recipientRole: "", recipientOrganization: "", recipientAddress: "",
    subject: "", body: "", closing: "", signatureName: "",
  };
}

// ============================================================
// ANIMATION VARIANTS
// ============================================================

const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};
const cardVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
  hover: { scale: 1.02, transition: { duration: 0.15 } },
};
const stepVariants: Variants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
};

// ============================================================
// HELPERS
// ============================================================

function TypeIcon({ type, className }: { type: DocumentType; className?: string }) {
  switch (type) {
    case "letter": return <Mail className={className} />;
    case "compterendu": return <ClipboardList className={className} />;
    case "report": return <FileText className={className} />;
  }
}

function TypeBadge({ type }: { type: DocumentType }) {
  const config = getDocumentTypeConfig(type);
  const colors = {
    letter: "bg-amber-50 text-amber-700 border-amber-200",
    compterendu: "bg-emerald-50 text-emerald-700 border-emerald-200",
    report: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return <Badge variant="outline" className={`text-xs font-medium ${colors[type]}`}>{config?.label ?? type}</Badge>;
}

interface ParsedLetter {
  showHeader: boolean;
  place: string;
  sender: string[];
  date: string;
  recipient: string[];
  subject: string;
  salutation: string;
  body: string[];
  closing: string;
  signature: string[];
}

function cleanLine(line: string) {
  return line.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanDocumentPreview(value: string) {
  return value
    .replace(/\[\[(?:header:(?:true|false)|place:[^\]]*|date:[^\]]*|.*?)]\]/gi, " ")
    .replace(/\[\[(.*?)\]\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHeaderMetadata(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const match = normalized.match(/^\[\[header:(true|false)\]\]\s*(?:\n|$)/i);
  const showHeader = match ? match[1].toLowerCase() === "true" : true;
  const strippedContent = match
    ? normalized.replace(/^\[\[header:(true|false)\]\]\s*(?:\n|$)/i, "")
    : normalized;
  return { showHeader, strippedContent };
}

function parseLetterContent(content: string): ParsedLetter {
  const { showHeader, strippedContent } = extractHeaderMetadata(content);
  const metaPlace = strippedContent.match(/^\[\[place:(.*?)\]\]$/im)?.[1]?.trim() ?? "";
  const metaDate  = strippedContent.match(/^\[\[date:(.*?)\]\]$/im)?.[1]?.trim()  ?? "";

  const lines = strippedContent
    .split("\n")
    .filter((l) => !/^\[\[.*?\]\]/.test(l.trim()));

  type State = "init" | "sender" | "recipient" | "body" | "closing" | "signature";
  let state: State = "init";
  const acc: Record<State, string[]> = {
    init: [], sender: [], recipient: [], body: [], closing: [], signature: [],
  };
  let subject = "";
  let salutation = "";

  for (const raw of lines) {
    const t = raw.trim();
    if (/^Exp[eé]diteur\s*:?\s*$/i.test(t))       { state = "sender";    continue; }
    if (/^Destinataire\s*:?\s*$/i.test(t))         { state = "recipient"; continue; }
    if (/^Formule de politesse\s*:?\s*$/i.test(t)) { state = "closing";   continue; }
    if (/^Signature\s*:?\s*$/i.test(t))            { state = "signature"; continue; }

    const objetM = t.match(/^Objet\s*:\s*(.*)$/i);
    if (objetM) { subject = objetM[1].trim(); state = "recipient"; continue; }

    if (/^(Madame|Monsieur)\b/i.test(t) && state !== "sender" && state !== "signature") {
      salutation = t; state = "body"; continue;
    }

    if (!t) { if (state === "body") acc.body.push(""); continue; }
    if (state === "recipient" && !subject) { subject = t; continue; }
    if (state !== "init") acc[state].push(cleanLine(t));
  }

  const bodyParagraphs = acc.body
    .join("\n").split(/\n{2,}/)
    .map((p) => p.trim()).filter(Boolean);

  return {
    showHeader, place: metaPlace, sender: acc.sender, date: metaDate,
    recipient: acc.recipient,
    subject: subject.replace(/\*\*/g, "").trim(),
    salutation: salutation || "Madame, Monsieur,",
    body: bodyParagraphs, closing: acc.closing.join(" ").trim(),
    signature: acc.signature,
  };
}

function composeLetterContentFromParsed(letter: ParsedLetter, improvedBody: string): string {
  return [
    `[[header:${letter.showHeader ? "true" : "false"}]]`,
    `[[place:${letter.place}]]`,
    `[[date:${letter.date}]]`,
    "", "Expéditeur:", letter.sender.join("\n"),
    "", "Destinataire:", letter.recipient.join("\n"),
    "", `Objet: ${letter.subject}`,
    "", letter.salutation, "",
    improvedBody.trim(),
    "", "Formule de politesse:", letter.closing,
    "", "Signature:", letter.signature.join("\n"),
  ].join("\n");
}

function sanitizeLetterBodyStrict(content: string, letter?: ParsedLetter): string {
  const cleaned = content.replace(/\[\[.*?\]\]/g, "");
  const lines = cleaned.split("\n").filter((line) => {
    const t = line.trim();
    if (/^Exp[eé]diteur\s*:?\s*$/i.test(t)) return false;
    if (/^Destinataire\s*:?\s*$/i.test(t)) return false;
    if (/^Objet\s*:/i.test(t)) return false;
    if (/^Formule de politesse\s*:?\s*$/i.test(t)) return false;
    if (/^Signature\s*:?\s*$/i.test(t)) return false;
    if (letter && /^(Madame|Monsieur)\b/i.test(t) && t.toLowerCase() === letter.salutation.trim().toLowerCase()) return false;
    return true;
  });
  return lines.join("\n").trim();
}

function toggleDocHeader(content: string, type: DocumentType): string {
  if (type === "letter") {
    const parsed = parseLetterContent(content);
    parsed.showHeader = !parsed.showHeader;
    return composeLetterContentFromParsed(parsed, parsed.body.join("\n\n"));
  }
  const { showHeader, strippedContent } = extractHeaderMetadata(content);
  if (content.match(/^\[\[header:(true|false)\]\]\s*(?:\n|$)/i)) {
    return `[[header:${!showHeader ? "true" : "false"}]]\n${strippedContent}`;
  }
  return `[[header:true]]\n${strippedContent}`;
}

function appendImageMarkdown(content: string, type: DocumentType, fileName: string): string {
  const imageBlock = `\n![${fileName}](image-upload)\n*Figure : ${fileName}*\n`;
  if (type === "letter") {
    const letter = parseLetterContent(content);
    const nextBody = `${letter.body.join("\n\n")}${letter.body.length ? "\n\n" : ""}${imageBlock.trim()}`;
    return composeLetterContentFromParsed(letter, nextBody);
  }
  return `${content}${imageBlock}`;
}

function getSignatureName(signature: string[]) {
  const lines = signature.map(cleanLine).filter(Boolean);
  return lines.filter((line) => !/^_{3,}$/.test(line)).at(-1) ?? "";
}

function applyColorSyntax(html: string) {
  return html.replace(/\[\[color:([^\]]+)\]\]([\s\S]*?)\[\[\/color\]\]/gi,
    (_match, color: string, inner: string) => `<span style="color:${escapeHtml(color)};">${inner}</span>`
  );
}

// ============================================================
// LETTER FORM EDITOR
// ============================================================

interface LetterFormEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

function LetterFormEditor({ content, onChange, textareaRef }: LetterFormEditorProps) {
  const letter = useMemo(() => parseLetterContent(content), [content]);

  const updateField = (key: keyof ParsedLetter, value: any) => {
    const next = { ...letter };
    if (key === "sender" || key === "recipient" || key === "signature") {
      next[key] = typeof value === "string" ? value.split("\n") : value;
    } else if (key === "body") {
      next.body = typeof value === "string"
        ? value.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
        : value;
    } else {
      (next as any)[key] = value;
    }
    onChange(composeLetterContentFromParsed(next, next.body.join("\n\n")));
  };

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="text-base font-semibold text-gray-900">Édition des champs de la lettre</h3>
        <span className="text-xs text-gray-400">Modifications synchronisées en temps réel avec l&apos;aperçu</span>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/70 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-violet-900">En-tête officiel</p>
          <p className="text-xs text-violet-700">Active ou retire l&apos;en-tête composé des deux logos officiels.</p>
        </div>
        <Switch
          checked={letter.showHeader}
          onCheckedChange={(checked) => updateField("showHeader", checked)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Lieu</label>
          <Input value={letter.place} onChange={(e) => updateField("place", e.target.value)} className="h-11 rounded-xl border-gray-200 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
          <Input value={letter.date} onChange={(e) => updateField("date", e.target.value)} className="h-11 rounded-xl border-gray-200 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Expéditeur</label>
          <Textarea value={letter.sender.join("\n")} onChange={(e) => updateField("sender", e.target.value)} className="min-h-[100px] rounded-xl border-gray-200 text-sm resize-none" placeholder="Nom&#10;Adresse&#10;Tél (optionnel)" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Destinataire</label>
          <Textarea value={letter.recipient.join("\n")} onChange={(e) => updateField("recipient", e.target.value)} className="min-h-[100px] rounded-xl border-gray-200 text-sm resize-none" placeholder="Nom&#10;Fonction&#10;Organisation&#10;Adresse" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Objet / Titre</label>
        <Input value={letter.subject} onChange={(e) => updateField("subject", e.target.value)} className="h-11 rounded-xl border-gray-200 text-sm" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Salutation</label>
        <Input value={letter.salutation} onChange={(e) => updateField("salutation", e.target.value)} className="h-11 rounded-xl border-gray-200 text-sm" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Corps de la lettre (Markdown accepté)</label>
        <Textarea ref={textareaRef} value={letter.body.join("\n\n")} onChange={(e) => updateField("body", e.target.value)} className="min-h-[220px] rounded-xl border-gray-200 text-sm font-sans leading-relaxed" placeholder="Rédigez le corps de la lettre ici..." />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Formule de politesse</label>
        <Textarea value={letter.closing} onChange={(e) => updateField("closing", e.target.value)} className="min-h-[60px] rounded-xl border-gray-200 text-sm resize-none" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Signature</label>
        <Textarea value={letter.signature.join("\n")} onChange={(e) => updateField("signature", e.target.value)} className="min-h-[80px] rounded-xl border-gray-200 text-sm resize-none" placeholder="Nom et fonction du signataire" />
      </div>
    </div>
  );
}

// ============================================================
// LETTER PREVIEW
// ============================================================

function LetterPreview({ content }: { content: string }) {
  const letter = parseLetterContent(content);
  const signatureName = getSignatureName(letter.signature);

  return (
    <div className="relative mx-auto bg-white shadow-lg border border-gray-200 rounded-sm"
      style={{ width: "612px", minHeight: "792px", padding: "72px", fontFamily: "'Times New Roman', Georgia, serif", fontSize: "12pt", lineHeight: "1.5", textAlign: "justify" }}>
      {letter.showHeader && <div className="mb-6"><OfficialHeader showRule /></div>}

      <div className="flex items-start justify-between gap-6 mb-10">
        <div className="max-w-[45%] whitespace-pre-line">{letter.sender.join("\n")}</div>
        <div className="text-right whitespace-pre-line max-w-[45%] ml-auto">{letter.date}</div>
      </div>

      <div className="whitespace-pre-line mb-8">{letter.recipient.join("\n")}</div>

      {letter.subject && <div className="mb-12 font-normal">Objet : {letter.subject}</div>}

      <div className="mb-10">{letter.salutation}</div>

      <div className="space-y-4 font-normal">
        {letter.body.map((paragraph, index) => (
          <div key={`${index}-${paragraph}`}
            className="m-0 prose prose-gray max-w-none font-sans text-justify"
            style={{ fontFamily: "'Times New Roman', Georgia, serif", fontSize: "12pt", lineHeight: "1.5", textAlign: "justify" }}
            dangerouslySetInnerHTML={{ __html: markdownToBasicHtml(paragraph) }}
          />
        ))}
      </div>

      {letter.closing && <div className="mt-12 font-normal">{letter.closing}</div>}

      {signatureName && (
        <div className="mt-20 flex justify-end">
          <div className="w-64 text-right">
            <div className="border-t border-gray-900 pt-5 whitespace-pre-line">{signatureName}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// USER HOOK
// ============================================================

interface UserInfo { name: string; role: string; isAdmin: boolean; }

function useCurrentUser() {
  const { user, isSuperAdmin, isSuperviseur, isLoading } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setUserInfo(null);
      return;
    }
    
    const isAdmin = isSuperAdmin || isSuperviseur;
    setUserInfo(isAdmin 
      ? { name: "Elson PROPHETE, Ing, Adm", role: "Doctorant en génie des ressources hydriques (ISTEAH)", isAdmin: true }
      : { name: user.name || 'Utilisateur', role: 'Utilisateur', isAdmin: false }
    );
  }, [user, isSuperAdmin, isSuperviseur, isLoading]);

  return userInfo;
}

// ============================================================
// DOCUMENT PAGES
// ============================================================

export function DocumentPages({ content, type, title, showPageNumbers = true, authorName, authorPosition }: {
  content: string; type: DocumentType; title?: string; showPageNumbers?: boolean;
  authorName?: string; authorPosition?: string;
}) {
  const user = useCurrentUser();
  const finalName = authorName || user?.name || "...";
  const finalPosition = authorPosition || user?.position || "...";
  if (type === "letter") return <LetterPreview content={content} />;

  const { showHeader, strippedContent } = extractHeaderMetadata(content);
  const isSpecialDoc = type === "compterendu" || type === "report";

  return (
    <div className="space-y-6">
      {/* Cover page for special docs */}
      <div className="relative mx-auto bg-white shadow-lg border border-gray-200 rounded-sm"
        style={{ width: "612px", minHeight: "792px", padding: "72px", fontFamily: "'Times New Roman', Georgia, serif", fontSize: "12pt", lineHeight: "1.5" }}>
        {showHeader && <div className="mb-6"><OfficialHeader showRule /></div>}

        {isSpecialDoc ? (
          <div className="flex flex-col items-center justify-between"
            style={{ minHeight: showHeader ? "548px" : "648px", paddingTop: "60px", paddingBottom: "40px" }}>
            <div className="text-center w-full">
              <h1 className="text-[16pt] font-bold uppercase mb-8" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
                {type === "compterendu" ? "COMPTE RENDU DE FORMATION" : "RAPPORT"}
              </h1>
              {title && (
                <div className="text-[12pt] font-bold text-center mx-auto mb-12 max-w-[80%]">
                  {title}
                </div>
              )}
              <div className="text-[12pt] font-bold mb-16 text-center">
                Bureau Nord | {format(new Date(), "d MMMM yyyy", { locale: fr })} |
              </div>
            </div>
            <div className="w-full">
              <div className="mt-20">
                <div className="font-bold text-[12pt]">Préparé par : {finalName}</div>
                <div className="text-[11pt] uppercase italic whitespace-pre-line">{finalPosition}</div>
              </div>
            </div>
            <div className="w-full text-right font-bold mt-auto">
              {format(new Date(), "d MMMM yyyy", { locale: fr })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: "648px" }}>
            <div className="prose prose-gray prose-lg max-w-none text-justify"
              dangerouslySetInnerHTML={{ __html: markdownToBasicHtml(strippedContent) }} />
          </div>
        )}

        {showPageNumbers && (
          <div className="absolute bottom-8 left-0 right-0 text-center text-xs text-gray-400">
            Page de couverture
          </div>
        )}
      </div>

      <PaginatedContent content={strippedContent} startPageNum={2} showPageNumbers={showPageNumbers} />
    </div>
  );
}

function PaginatedContent({ content, startPageNum = 1, showPageNumbers = true }: {
  content: string; startPageNum?: number; showPageNumbers?: boolean;
}) {
  const pages = useMemo(() => {
    const parts = content.split(/\s*-{2,}PAGE-{2,}\s*|\n?\\newpage\n?/i).map(p => p.trim()).filter(Boolean);
    return parts.length > 0 ? parts : [content];
  }, [content]);

  return (
    <div className="space-y-8">
      {pages.map((pageContent, index) => (
        <div key={index} className="relative mx-auto bg-white shadow-lg border border-gray-200 rounded-sm"
          style={{ width: "612px", minHeight: "792px", padding: "72px 72px 80px", fontFamily: "'Times New Roman', Georgia, serif", fontSize: "12pt", lineHeight: "1.5", textAlign: "justify", wordBreak: "break-word", overflowWrap: "break-word" }}>
          <div dangerouslySetInnerHTML={{ __html: markdownToBasicHtml(pageContent) }} />
          {showPageNumbers && (
            <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-gray-400">
              {startPageNum + index}
            </div>
          )}
        </div>
      ))}
      <div className="text-center text-xs text-gray-400 mt-2">
        {pages.length} page{pages.length > 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================

function DashboardView({ onNewDocument, onOpenDocument }: {
  onNewDocument: () => void;
  onOpenDocument: (doc: DocumentItem) => void;
}) {
  const user = useCurrentUser();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de charger les documents", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocuments = useMemo(() => {
    if (!search.trim()) return documents;
    const q = search.toLowerCase();
    return documents.filter(d =>
      d.title.toLowerCase().includes(q) ||
      getVariantLabel(d.type, d.variant).toLowerCase().includes(q) ||
      d.preview.toLowerCase().includes(q)
    );
  }, [documents, search]);

  const handleDelete = async (id: string) => {
    try {
      await removeDocument(id);
      await loadDocuments();
      toast({ title: "Document supprimé" });
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de supprimer le document", variant: "destructive" });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const n = await duplicateDocument(id);
      if (n) { 
        await loadDocuments(); 
        toast({ title: "Document dupliqué" }); 
      }
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de dupliquer le document", variant: "destructive" });
    }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Assistant de Documents IA</h1>
                <p className="text-sm text-gray-500 hidden sm:block">Créez vos documents professionnels en quelques secondes.</p>
              </div>
            </div>
            <Button onClick={onNewDocument} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 rounded-xl px-6" size="lg">
              <Plus className="w-4 h-4 mr-2" />Nouveau document
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="relative mb-6 sm:mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Rechercher un document..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-11 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base" />
        </div>

        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Mes documents</h2>
          {!isLoading && documents.length > 0 && <span className="text-sm text-gray-500">{documents.length} document{documents.length > 1 ? "s" : ""}</span>}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24">
            <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-4" />
            <p className="text-sm text-gray-500">Chargement de vos documents...</p>
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <AnimatePresence mode="popLayout">
              {filteredDocuments.map(doc => (
                <motion.div key={doc.id} variants={cardVariants} initial="initial" animate="animate" whileHover="hover" layout>
                  <Card className="group cursor-pointer border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => onOpenDocument(doc)}>
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <TypeIcon type={doc.type} className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm font-semibold text-gray-900 truncate">{doc.title.length > 30 ? doc.title.substring(0, 30) + '...' : doc.title}</CardTitle>
                            <TypeBadge type={doc.type} />
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onOpenDocument(doc)}><Eye className="w-4 h-4 mr-2" />Ouvrir</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToPDF(doc, user)}><Download className="w-4 h-4 mr-2" />Télécharger PDF</DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              if (navigator.share) { try { await navigator.share({ title: doc.title, text: cleanDocumentPreview(doc.preview || doc.content) }); } catch {} }
                              else { await navigator.clipboard.writeText(doc.content); }
                            }}><Share2 className="w-4 h-4 mr-2" />Partager</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToPDF(doc, user)}><Printer className="w-4 h-4 mr-2" />Imprimer</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(doc.id)}><Copy className="w-4 h-4 mr-2" />Dupliquer</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0" onClick={() => onOpenDocument(doc)}>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{cleanDocumentPreview(doc.preview || doc.content)}</p>
                      <span className="text-xs text-gray-400">Modifié le {format(new Date(doc.updatedAt), "d MMM yyyy", { locale: fr })}</span>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 sm:py-24">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-6"><FileText className="w-10 h-10 text-gray-300" /></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun document créé</h3>
            <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">Commencez par générer votre premier document professionnel.</p>
            <Button onClick={onNewDocument} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 rounded-xl px-6">
              <Plus className="w-4 h-4 mr-2" />Créer un document
            </Button>
          </motion.div>
        )}
      </main>
    </motion.div>
  );
}

// ============================================================
// CREATE VIEW — 6-step wizard
// ============================================================

function CreateView({ onCancel, onCreated }: { onCancel: () => void; onCreated: (doc: DocumentItem) => void }) {
  const [step, setStep] = useState<CreateStep>(1);
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [planEdited, setPlanEdited] = useState("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [letterFields, setLetterFields] = useState<LetterFields>(() => createDefaultLetterFields());
  const [showHeaderToggle, setShowHeaderToggle] = useState(true);
  const { toast } = useToast();

  const totalSteps = 6;
  const stepLabels: Record<number, string> = { 1: "Type", 2: "Modèle", 3: "Détails", 4: "Plan", 5: "Validation", 6: "Génération" };
  const selectedLetterGuide = useMemo(() => getLetterGuide(selectedVariant), [selectedVariant]);
  const currentTypeConfig = selectedType ? getDocumentTypeConfig(selectedType) : null;

  const selectedVariantLabel = useMemo(() => {
    if (!currentTypeConfig || !selectedVariant) return null;
    return currentTypeConfig.variants.find((v) => v.id === selectedVariant)?.label ?? null;
  }, [currentTypeConfig, selectedVariant]);

  const documentTitlePlaceholder = useMemo(() => {
    if (selectedType === "report") return selectedVariantLabel ? `Ex: ${selectedVariantLabel}` : "Ex: Rapport d'activité";
    if (selectedType === "compterendu") return selectedVariantLabel ? `Ex: ${selectedVariantLabel}` : "Ex: Compte rendu de réunion";
    return selectedLetterGuide?.subjectPlaceholder ?? "Ex: Lettre administrative";
  }, [selectedLetterGuide, selectedType, selectedVariantLabel]);

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return selectedType !== null;
      case 2: return selectedVariant !== null;
      case 3:
        if (selectedType === "letter") return title.trim().length > 0;
        if (selectedType === "compterendu") return title.trim().length > 0 && keyPoints.length > 0 && keyPoints.every(kp => kp.title.trim().length > 0);
        return title.trim().length > 0 && description.trim().length > 0;
      case 4: return true;
      case 5: return planEdited.trim().length > 0;
      case 6: return false;
    }
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType, variant: selectedVariant, title: title.trim(),
          description: description.trim(),
          keyPoints: selectedType === "compterendu" ? keyPoints : undefined,
          pageCount: selectedType !== "letter" ? pageCount : undefined,
        }),
      });
      if (!res.ok) throw new Error("Erreur lors de la génération du plan");
      const data = await res.json();
      setPlanEdited(data.plan || "");
      setStep(4);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      setError(msg);
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally { setIsGeneratingPlan(false); }
  };

  const handleValidateAndGenerate = async () => {
    setStep(6);
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType, variant: selectedVariant, title: title.trim(),
          description: description.trim(),
          keyPoints: selectedType === "compterendu" ? keyPoints : undefined,
          plan: planEdited.trim(),
          pageCount: selectedType !== "letter" ? pageCount : undefined,
          fields: selectedType === "letter" ? letterFields : undefined,
          showHeader: selectedType === "letter" ? showHeaderToggle : undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Erreur"); }
      const data = await res.json();
      
      const docData = {
        title: data.title || title.trim(),
        type: selectedType!, 
        variant: selectedVariant!, 
        content: data.content,
        preview: generatePreview(data.content),
        recipientName: letterFields?.recipientName,
        recipientRole: letterFields?.recipientRole,
        recipientOrg: letterFields?.recipientOrganization,
        senderName: letterFields?.senderName,
        senderAddress: letterFields?.senderAddress,
        documentDate: parseDocumentDateInput(letterFields?.date),
      };
      
      const createdDoc = await createDocument(docData);
      if (!createdDoc) throw new Error("Erreur lors de la sauvegarde du document");
      
      toast({ title: "Document généré", description: `"${createdDoc.title}" a été créé avec succès.` });
      onCreated(createdDoc);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      setError(msg);
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally { setIsGenerating(false); }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    if (step === 3) {
      selectedType === "letter" ? handleValidateAndGenerate() : handleGeneratePlan();
    } else {
      setStep((step + 1) as CreateStep);
    }
  };

  const addKeyPoint = () => setKeyPoints([...keyPoints, { id: crypto.randomUUID(), title: "", description: "" }]);
  const removeKeyPoint = (id: string) => setKeyPoints(keyPoints.filter(kp => kp.id !== id));
  const updateKeyPoint = (id: string, field: "title" | "description", value: string) =>
    setKeyPoints(keyPoints.map(kp => kp.id === id ? { ...kp, [field]: value } : kp));
  const updateLetterField = (field: keyof LetterFields, value: string) =>
    setLetterFields((prev) => ({ ...prev, [field]: value }));

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-lg"><ArrowLeft className="w-4 h-4" /></Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Nouveau document</h1>
              <p className="text-xs text-gray-500">Étape {step} sur {totalSteps} — {stepLabels[step]}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s <= step ? "bg-gradient-to-r from-violet-500 to-purple-500" : "bg-gray-200"}`} />
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {/* STEP 1: Type */}
          {step === 1 && (
            <motion.div key="step1" variants={stepVariants} initial="initial" animate="animate" exit="exit">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Choisir le type de document</h2>
              <p className="text-sm text-gray-500 mb-6">Sélectionnez le format qui correspond à votre besoin.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {DOCUMENT_TYPES.map(dt => (
                  <motion.div key={dt.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card className={`cursor-pointer transition-all duration-200 rounded-xl border-2 relative ${selectedType === dt.id ? "border-violet-500 bg-violet-50/50 shadow-md shadow-violet-100" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}
                      onClick={() => {
                        setSelectedType(dt.id);
                        setSelectedVariant(null);
                        if (dt.id === "letter" && selectedType !== "letter") {
                          setLetterFields(createDefaultLetterFields());
                          setShowHeaderToggle(true);
                        }
                      }}>
                      <CardHeader className="pb-2">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${selectedType === dt.id ? "bg-violet-100 text-violet-600" : "bg-gray-100 text-gray-500"}`}>
                          <TypeIcon type={dt.id} className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-base">{dt.label}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0"><CardDescription className="text-xs">{dt.description}</CardDescription></CardContent>
                      {selectedType === dt.id && (
                        <div className="absolute top-3 right-3">
                          <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Variant */}
          {step === 2 && currentTypeConfig && (
            <motion.div key="step2" variants={stepVariants} initial="initial" animate="animate" exit="exit">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{currentTypeConfig.label} — Choisissez une variante</h2>
              <p className="text-sm text-gray-500 mb-6">Sélectionnez le modèle spécifique.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentTypeConfig.variants.map(v => (
                  <motion.div key={v.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Card className={`cursor-pointer transition-all duration-200 rounded-xl border-2 ${selectedVariant === v.id ? "border-violet-500 bg-violet-50/50 shadow-md shadow-violet-100" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}
                      onClick={() => setSelectedVariant(v.id)}>
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedVariant === v.id ? "bg-violet-100 text-violet-600" : "bg-gray-100 text-gray-500"}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <CardTitle className="text-sm font-medium">{v.label}</CardTitle>
                          {selectedVariant === v.id && (
                            <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center ml-auto shrink-0"><Check className="w-3 h-3 text-white" /></div>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Details */}
          {step === 3 && (
            <motion.div key="step3" variants={stepVariants} initial="initial" animate="animate" exit="exit">
              {selectedType === "compterendu" || selectedType === "report" ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedType === "compterendu" ? "Détails du compte rendu" : "Détails du rapport"}
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">
                    {selectedType === "compterendu" ? "Ajoutez les grands points et choisissez le nombre de pages." : "Décrivez votre besoin, ajoutez les grands points et choisissez le nombre de pages."}
                  </p>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre du document</label>
                      <Input placeholder={documentTitlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {selectedType === "compterendu" ? "Description courte" : "Description détaillée"}
                      </label>
                      <Textarea placeholder={selectedType === "compterendu" ? "Brève description du contexte..." : "Décrivez le contexte, les objectifs, les données à inclure..."} value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[70px] rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de pages (contenu)</label>
                      <div className="flex items-center gap-3 flex-wrap">
                        {(selectedType === "compterendu" ? [1, 2] : [5, 10, 15, 20, 25, 30]).map(n => (
                          <button key={n} onClick={() => setPageCount(n)} className={`w-12 h-12 rounded-xl border-2 text-sm font-medium transition-all ${pageCount === n ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>{n}</button>
                        ))}
                        <span className="text-xs text-gray-400 ml-1">page{pageCount > 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Sans compter la page de couverture</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">Grands points</label>
                        <Button variant="outline" size="sm" onClick={addKeyPoint} className="rounded-lg text-xs"><PlusCircle className="w-3.5 h-3.5 mr-1.5" />Ajouter</Button>
                      </div>
                      <AnimatePresence>
                        {keyPoints.map((kp, i) => (
                          <motion.div key={kp.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="mb-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 text-xs font-bold mt-1">{i + 1}</div>
                              <div className="flex-1 space-y-2">
                                <Input placeholder="Titre du point" value={kp.title} onChange={(e) => updateKeyPoint(kp.id, "title", e.target.value)} className="h-10 rounded-lg border-gray-200 bg-white text-sm font-medium" />
                                <Textarea placeholder="Description (optionnel)" value={kp.description} onChange={(e) => updateKeyPoint(kp.id, "description", e.target.value)} className="min-h-[50px] rounded-lg border-gray-200 bg-white text-sm resize-none" />
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => removeKeyPoint(kp.id)} className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-500 shrink-0"><Minus className="w-4 h-4" /></Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {keyPoints.length === 0 && (
                        <div className="text-center py-6 text-gray-400"><ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Ajoutez au moins un grand point</p></div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Détails de la lettre</h2>
                  <p className="text-sm text-gray-500 mb-6">Renseignez les coordonnées, l&apos;objet et le contenu.</p>
                  <div className="mb-6 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-violet-900">{selectedLetterGuide?.label ?? "Lettre professionnelle"}</p>
                        <p className="text-xs text-violet-700/90">{selectedLetterGuide?.hint ?? "Complétez les champs de base pour guider la génération."}</p>
                      </div>
                      {selectedLetterGuide?.structure?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedLetterGuide.structure.map((item) => (
                            <Badge key={item} variant="outline" className="border-violet-200 bg-white text-violet-700">{item}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-violet-100 bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">En-tête officiel</p>
                        <p className="text-xs text-gray-500">L&apos;en-tête sera construit à partir des deux logos officiels.</p>
                      </div>
                      <Switch checked={showHeaderToggle} onCheckedChange={setShowHeaderToggle} />
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">Expéditeur</h3>
                          <span className="text-xs text-gray-400">Identité et adresse</span>
                        </div>
                        <Input placeholder="Nom complet de l'expéditeur" value={letterFields.senderName} onChange={(e) => updateLetterField("senderName", e.target.value)} className="h-12 rounded-xl border-gray-200 bg-white text-base" />
                        <Textarea placeholder="Adresse complète de l'expéditeur" value={letterFields.senderAddress} onChange={(e) => updateLetterField("senderAddress", e.target.value)} className="min-h-[90px] rounded-xl border-gray-200 bg-white text-base resize-none" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input placeholder="Téléphone (optionnel)" value={letterFields.senderPhone} onChange={(e) => updateLetterField("senderPhone", e.target.value)} className="h-12 rounded-xl border-gray-200 bg-white text-base" />
                          <Input placeholder="Email (optionnel)" value={letterFields.senderEmail} onChange={(e) => updateLetterField("senderEmail", e.target.value)} className="h-12 rounded-xl border-gray-200 bg-white text-base" />
                        </div>
                      </div>
                      <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">Destinataire</h3>
                          <span className="text-xs text-gray-400">Contact et structure</span>
                        </div>
                        <Input placeholder="Nom du destinataire ou service" value={letterFields.recipientName} onChange={(e) => updateLetterField("recipientName", e.target.value)} className="h-12 rounded-xl border-gray-200 bg-white text-base" />
                        <Input placeholder="Fonction / titre du destinataire" value={letterFields.recipientRole} onChange={(e) => updateLetterField("recipientRole", e.target.value)} className="h-12 rounded-xl border-gray-200 bg-white text-base" />
                        <Input placeholder="Organisation / institution destinataire" value={letterFields.recipientOrganization} onChange={(e) => updateLetterField("recipientOrganization", e.target.value)} className="h-12 rounded-xl border-gray-200 bg-white text-base" />
                        <Textarea placeholder="Adresse complète du destinataire" value={letterFields.recipientAddress} onChange={(e) => updateLetterField("recipientAddress", e.target.value)} className="min-h-[90px] rounded-xl border-gray-200 bg-white text-base resize-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Lieu</label>
                        <Input placeholder="Ex: Port-au-Prince" value={letterFields.place} onChange={(e) => updateLetterField("place", e.target.value)} className="h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                        <Input placeholder="Ex: 10 juin 2026" value={letterFields.date} onChange={(e) => updateLetterField("date", e.target.value)} className="h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Objet / titre</label>
                        <Input placeholder={documentTitlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Contexte additionnel</label>
                      <Textarea placeholder="Ajoutez les précisions utiles pour la génération (référence, urgence, ton attendu, pièces jointes, etc.)" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[110px] rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Corps de la lettre</label>
                      <Textarea placeholder={selectedLetterGuide?.bodyPlaceholder ?? "Décrivez le contenu de la lettre..."} value={letterFields.body} onChange={(e) => updateLetterField("body", e.target.value)} className="min-h-[180px] rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom pour la signature</label>
                      <Textarea placeholder="Nom et fonction de la personne signataire" value={letterFields.signatureName} onChange={(e) => updateLetterField("signatureName", e.target.value)} className="min-h-[100px] rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base resize-none" />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* STEP 4: Plan */}
          {step === 4 && (
            <motion.div key="step4" variants={stepVariants} initial="initial" animate="animate" exit="exit">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center"><File className="w-5 h-5 text-violet-600" /></div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Plan du document</h2>
                  <p className="text-sm text-gray-500">Vérifiez et modifiez le plan avant la génération.</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Plan généré par l&apos;IA</span>
                  <span className="text-xs text-gray-400">Modifiable</span>
                </div>
                <Textarea value={planEdited} onChange={(e) => setPlanEdited(e.target.value)} className="min-h-[300px] rounded-lg border-gray-200 bg-white text-sm leading-relaxed resize-none font-mono" placeholder="Le plan apparaîtra ici..." />
              </div>
            </motion.div>
          )}

          {/* STEP 5: Validation */}
          {step === 5 && (
            <motion.div key="step5" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4">
                <ThumbsUp className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Valider le plan ?</h2>
              <p className="text-sm text-gray-500 text-center max-w-sm mb-6">
                L&apos;IA va générer le document en suivant exactement ce plan. Vous pourrez le modifier ensuite.
              </p>
              <div className="w-full max-w-md p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600 max-h-[200px] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans">{planEdited}</pre>
              </div>
            </motion.div>
          )}

          {/* STEP 6: Generating */}
          {step === 6 && (
            <motion.div key="step6" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center py-16">
              {isGenerating ? (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-6">
                    <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Génération en cours...</h2>
                  <p className="text-sm text-gray-500 text-center max-w-sm">L&apos;IA rédige votre document en suivant le plan validé.</p>
                </>
              ) : error ? (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mb-6"><X className="w-10 h-10 text-red-400" /></div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur</h2>
                  <p className="text-sm text-gray-500 text-center max-w-sm mb-6">{error}</p>
                  <Button variant="outline" onClick={() => setStep(4)} className="rounded-xl"><ChevronLeft className="w-4 h-4 mr-2" />Réessayer</Button>
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        {step < 6 && step !== 5 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button variant="outline" onClick={step === 1 ? onCancel : () => setStep((step - 1) as CreateStep)} className="rounded-xl" disabled={isGeneratingPlan}>
              {step === 1 ? "Annuler" : <><ChevronLeft className="w-4 h-4 mr-1" />Retour</>}
            </Button>
            <Button onClick={handleNext} disabled={!canProceed() || isGeneratingPlan}
              className={step === 3 ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 rounded-xl px-6" : "rounded-xl px-6"}>
              {isGeneratingPlan ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Traitement...</> : <>Continuer <ChevronRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        )}
        {step === 5 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button variant="outline" onClick={() => setStep(4)} className="rounded-xl"><ChevronLeft className="w-4 h-4 mr-1" />Modifier le plan</Button>
            <Button onClick={handleValidateAndGenerate} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 rounded-xl px-6">
              <Sparkles className="w-4 h-4 mr-2" />Générer le document
            </Button>
          </div>
        )}
      </main>
    </motion.div>
  );
}

// ============================================================
// EDITOR VIEW
// ============================================================

function EditorView({ document: doc, onBack }: { document: DocumentItem; onBack: () => void }) {
  const user = useCurrentUser();
  const [currentDoc, setCurrentDoc] = useState<DocumentItem>(doc);
  const [showSource, setShowSource] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [isAiWorking, setIsAiWorking] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const headerEnabled = currentDoc.type === "letter"
    ? parseLetterContent(currentDoc.content).showHeader
    : extractHeaderMetadata(currentDoc.content).showHeader;

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleContentChange = useCallback((newContent: string) => {
    const updated: DocumentItem = {
      ...currentDoc, content: newContent,
      preview: generatePreview(newContent), updatedAt: new Date().toISOString(),
    };
    setCurrentDoc(updated);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateDocument(updated.id, { content: updated.content, preview: updated.preview }).catch(e => {
        console.error("Autosave failed", e);
      });
    }, 1000);
  }, [currentDoc]);

  useEffect(() => () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); }, []);
  useEffect(() => { if (showAiPanel) window.setTimeout(() => aiInputRef.current?.focus(), 0); }, [showAiPanel]);

  const insertMarkdown = useCallback((prefix: string, suffix = "") => {
    if (!showSource) { handleContentChange(currentDoc.content + prefix + "texte" + suffix); return; }
    if (currentDoc.type === "letter") {
      const ta = textareaRef.current;
      if (!ta) return;
      const letter = parseLetterContent(currentDoc.content);
      const bodyValue = letter.body.join("\n\n");
      const s = ta.selectionStart, e = ta.selectionEnd;
      const sel = bodyValue.substring(s, e);
      const nextBody = bodyValue.substring(0, s) + prefix + (sel || "texte") + suffix + bodyValue.substring(e);
      handleContentChange(composeLetterContentFromParsed(letter, nextBody));
      return;
    }
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = currentDoc.content.substring(s, e);
    handleContentChange(currentDoc.content.substring(0, s) + prefix + (sel || "texte") + suffix + currentDoc.content.substring(e));
  }, [currentDoc.content, handleContentChange, showSource]);

  const handleAiModify = async () => {
    if (!aiInstruction.trim()) return;
    setIsAiWorking(true);
    try {
      const letter = currentDoc.type === "letter" ? parseLetterContent(currentDoc.content) : null;
      const contentToImprove = currentDoc.type === "letter"
        ? letter?.body.join("\n\n").trim() || currentDoc.content
        : currentDoc.content;
      const res = await fetch("/api/documents/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contentToImprove, instruction: aiInstruction.trim(),
          title: currentDoc.title, type: currentDoc.type, variant: currentDoc.variant,
          scope: currentDoc.type === "letter" ? "body" : "full",
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Erreur"); }
      const data = await res.json();
      const improvedBody = sanitizeLetterBodyStrict(data.content || "", letter || undefined);
      const nextContent = currentDoc.type === "letter" && letter
        ? composeLetterContentFromParsed(letter, improvedBody)
        : data.content;
      const updatedDoc = {
        ...currentDoc,
        title: data.title && data.title !== currentDoc.title ? data.title : currentDoc.title,
        content: nextContent, preview: generatePreview(nextContent),
        updatedAt: new Date().toISOString(),
      };
      setCurrentDoc(updatedDoc);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      await updateDocument(updatedDoc.id, { title: updatedDoc.title, content: updatedDoc.content, preview: updatedDoc.preview });
      setAiInstruction("");
      setShowAiPanel(false);
      toast({ title: "Document modifié", description: "L'IA a modifié votre document." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally { setIsAiWorking(false); }
  };

  const handleImageUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        handleContentChange(appendImageMarkdown(currentDoc.content, currentDoc.type, file.name));
        toast({ title: "Image ajoutée" });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [currentDoc.content, handleContentChange, toast]);

  const aiSuggestions = [
    "Rends ce document plus professionnel.",
    "Ajoute une conclusion.",
    "Ajoute des statistiques.",
    "Résume ce document.",
    "Transforme en langage administratif.",
  ];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={onBack} className="rounded-lg shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-gray-900 truncate">
                  {currentDoc.title.length > 70 ? currentDoc.title.substring(0, 70) + "..." : currentDoc.title}
                </h1>
                <div className="flex items-center gap-2">
                  <TypeBadge type={currentDoc.type} />
                  <span className="text-xs text-gray-400">{format(new Date(currentDoc.updatedAt), "d MMM yyyy", { locale: fr })}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowAiPanel(!showAiPanel)} className="rounded-lg">
                <Sparkles className="w-4 h-4 mr-1.5 text-violet-500" /><span className="hidden sm:inline">Modifier avec IA</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowSource(!showSource)} className={`rounded-lg ${showSource ? "bg-violet-50 border-violet-200" : ""}`}>
                {showSource ? <><Eye className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">Aperçu</span></> : <><Code className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">Source</span></>}
              </Button>
              <div className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <span className="text-xs text-gray-500">En-tête</span>
                <Switch checked={headerEnabled} onCheckedChange={() => handleContentChange(toggleDocHeader(currentDoc.content, currentDoc.type))} />
              </div>
              <Button variant="outline" size="sm" onClick={() => exportToPDF(currentDoc, user)} className="rounded-lg">
                <Download className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">PDF</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)} className="rounded-lg">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Review Comment Alert */}
      {currentDoc.workflowStatus === 'a_corriger' && currentDoc.reviewComment && (
        <div className="bg-rose-50 border-b border-rose-100 px-4 sm:px-6 py-3 flex items-start gap-3">
          <div className="mt-0.5"><Sparkles className="w-5 h-5 text-rose-500" /></div>
          <div>
            <h3 className="text-sm font-bold text-rose-800">Correction demandée</h3>
            <p className="text-sm text-rose-700 mt-1">{currentDoc.reviewComment}</p>
            <div className="mt-2">
              <Button size="sm" onClick={() => {
                updateDocument(currentDoc.id, { workflowStatus: 'en_attente' }).then(() => {
                  setCurrentDoc({ ...currentDoc, workflowStatus: 'en_attente' });
                  toast({ title: 'Rapport soumis', description: 'Le rapport a été renvoyé pour validation.' });
                });
              }} className="bg-rose-600 hover:bg-rose-700 text-white h-8 text-xs rounded-md">
                Marquer comme corrigé et soumettre
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="border-b bg-white px-3 py-2 flex items-center gap-1 overflow-x-auto">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => insertMarkdown("**", "**")} title="Gras"><Bold className="w-4 h-4 text-gray-600" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => insertMarkdown("_", "_")} title="Italique"><Italic className="w-4 h-4 text-gray-600" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => insertMarkdown("\n## ", "\n")} title="Titre"><Heading1 className="w-4 h-4 text-gray-600" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => insertMarkdown("\n- ", "\n")} title="Liste"><List className="w-4 h-4 text-gray-600" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => insertMarkdown("\n| Col 1 | Col 2 |\n|---|---|\n| ", " | |\n")} title="Tableau"><Table className="w-4 h-4 text-gray-600" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={handleImageUpload} title="Image"><ImageIcon className="w-4 h-4 text-gray-600" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => insertMarkdown("\n> ", "\n")} title="Citation"><Quote className="w-4 h-4 text-gray-600" /></Button>
        <label className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white cursor-pointer">
          <input type="color" aria-label="Couleur du texte" title="Couleur" className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
            onChange={(e) => insertMarkdown(`[[color:${e.target.value}]]`, "[[/color]]")} />
        </label>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <Button variant="ghost" size="sm" onClick={handleImageUpload} className="h-8 rounded-lg text-xs gap-1.5">
          <FileUp className="w-3.5 h-3.5" /><span className="hidden sm:inline">Image</span>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto py-6"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f?.type.startsWith("image/")) {
            const r = new FileReader();
            r.onload = () => handleContentChange(appendImageMarkdown(currentDoc.content, currentDoc.type, f.name));
            r.readAsDataURL(f);
          }
        }}>
        {showSource ? (
          <div className="max-w-4xl mx-auto px-4">
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              {currentDoc.type === "letter"
                ? "Mode source structuré — remplissez les champs de la lettre sans casser la structure."
                : "Mode source — Code Markdown brut. Cliquez sur \"Aperçu\" pour revenir."}
            </div>
            {currentDoc.type === "letter" ? (
              <LetterFormEditor content={currentDoc.content} onChange={handleContentChange} textareaRef={textareaRef} />
            ) : (
              <textarea ref={textareaRef} value={currentDoc.content} onChange={(e) => handleContentChange(e.target.value)}
                className="w-full min-h-[70vh] p-4 font-mono text-sm text-gray-800 bg-white border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 leading-relaxed" spellCheck={false} />
            )}
          </div>
        ) : (
          <DocumentPages content={currentDoc.content} type={currentDoc.type} title={currentDoc.title} />
        )}
      </div>

      {/* AI Panel */}
      <AnimatePresence>
        {showAiPanel && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-20 rounded-t-2xl">
            <div className="max-w-3xl mx-auto p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
                  <h3 className="font-semibold text-gray-900">Modifier avec l&apos;IA</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAiPanel(false)} className="rounded-lg"><X className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {aiSuggestions.map((s, i) => (
                  <button key={i} onClick={() => setAiInstruction(s)} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors">{s}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input ref={aiInputRef} placeholder="Que souhaitez-vous modifier ?" value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiModify(); } }}
                    className="pl-10 h-11 rounded-xl border-gray-200" disabled={isAiWorking} />
                </div>
                <Button onClick={handleAiModify} disabled={isAiWorking || !aiInstruction.trim()}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl px-4">
                  {isAiWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Partager le document</DialogTitle><DialogDescription>Choisissez comment partager.</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start rounded-xl h-11" onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(currentDoc.title)}&body=${encodeURIComponent(currentDoc.content)}`); setShowShareDialog(false); }}><Mail className="w-4 h-4 mr-3" />Par email</Button>
            <Button variant="outline" className="w-full justify-start rounded-xl h-11" onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(currentDoc.content)}`); setShowShareDialog(false); }}><MessageSquare className="w-4 h-4 mr-3" />WhatsApp</Button>
            <Button variant="outline" className="w-full justify-start rounded-xl h-11" onClick={() => { window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(currentDoc.content)}`); setShowShareDialog(false); }}><Send className="w-4 h-4 mr-3" />Telegram</Button>
            <Button variant="outline" className="w-full justify-start rounded-xl h-11" onClick={async () => { await navigator.clipboard.writeText(currentDoc.content); toast({ title: "Copié" }); setShowShareDialog(false); }}><Copy className="w-4 h-4 mr-3" />Copier le contenu</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ============================================================
// PDF EXPORT
// ============================================================

function exportToPDF(doc: DocumentItem, user?: UserInfo | null) {
  const pw = window.open("", "_blank");
  if (!pw) return;

  const { showHeader, strippedContent } = extractHeaderMetadata(doc.content);
  const isSpecialDoc = doc.type === "compterendu" || doc.type === "report";
  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const coverTitle = doc.type === "compterendu" ? "COMPTE RENDU DE FORMATION" : "RAPPORT";
  const headerBlockHtml = buildOfficialHeaderHtml({ showRule: true });

  let bodyHtml = "";

  if (doc.type === "letter") {
    const letter = parseLetterContent(doc.content);
    const letterSignatureName = getSignatureName(letter.signature);
    bodyHtml = `
      ${letter.showHeader ? headerBlockHtml : ""}
      <div style="display:flex;justify-content:space-between;gap:24pt;margin-bottom:24pt;">
        <div style="white-space:pre-line;">${letter.sender.join("<br />")}</div>
        <div style="white-space:pre-line;text-align:right;">${letter.date ? letter.date.replace(/\n/g, "<br />") : ""}</div>
      </div>
      <div style="margin-bottom:18pt;white-space:pre-line;">${letter.recipient.join("<br />")}</div>
      ${letter.subject ? `<div style="margin-bottom:28pt;"><strong>Objet :</strong> ${escapeHtml(letter.subject)}</div>` : ""}
      <div style="margin-bottom:20pt;">${escapeHtml(letter.salutation)}</div>
      <div>${letter.body.map((p) => `<p>${markdownToBasicHtml(p)}</p>`).join("")}</div>
      ${letter.closing ? `<div style="margin-top:20pt;">${escapeHtml(letter.closing)}</div>` : ""}
      ${letterSignatureName ? `<div style="margin-top:72pt;text-align:right;"><div style="display:inline-block;min-width:180pt;border-top:1px solid #111;padding-top:18pt;white-space:pre-line;">${escapeHtml(letterSignatureName)}</div></div>` : ""}
    `;
  } else {
    if (isSpecialDoc) {
      bodyHtml += `
        <div class="cover-page">
          ${showHeader ? headerBlockHtml : ""}
          <div class="cover-center">
            <div style="text-align:center;width:100%;">
              <div style="font-size:16pt;font-weight:bold;text-transform:uppercase;margin-bottom:32pt;">${coverTitle}</div>
              ${doc.title ? `<div style="font-size:12pt;font-weight:bold;text-align:center;margin:0 auto 48pt auto;max-width:80%;">${escapeHtml(doc.title)}</div>` : ""}
              <div style="font-size:12pt;font-weight:bold;margin-bottom:64pt;text-align:center;">Bureau Nord | ${dateStr} |</div>
            </div>
            <div style="width:100%;margin-top:80pt;">
              <div style="font-weight:bold;font-size:12pt;">Préparé par : ${escapeHtml(user?.name || "...")}</div>
              <div style="font-size:11pt;text-transform:uppercase;font-style:italic;white-space:pre-line;">${escapeHtml(user?.position || "...")}</div>
            </div>
            <div style="width:100%;text-align:right;font-weight:bold;margin-top:auto;">${dateStr}</div>
          </div>
        </div>`;
    }

    const contentWithBreaks = strippedContent
      .split(/\s*-{2,}PAGE-{2,}\s*/i)
      .map(chunk => chunk.trim()).filter(Boolean)
      .map((chunk, i, arr) => {
        const html = markdownToBasicHtml(chunk);
        return i === arr.length - 1 ? html : `${html}<div class="page-break"></div>`;
      }).join("");

    bodyHtml += contentWithBreaks;
  }

  const css = `
@page { size: 8.5in 11in; margin: 1in; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: white; font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 1.5; color: #1a1a1a; text-align: justify; }
.cover-page { page-break-after: always; break-after: page; min-height: 9in; display: flex; flex-direction: column; }
.cover-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding-top: 60px; padding-bottom: 40px; }
h1, h2, h3, h4, h5, h6 { font-weight: bold; margin: 0 0 6pt 0; line-height: 1.4; text-align: left; page-break-after: avoid; }
h1 { font-size: 18pt; } h2 { font-size: 15pt; margin-top: 14pt; } h3 { font-size: 13pt; margin-top: 10pt; }
h4 { font-size: 12pt; margin-top: 8pt; } h5 { font-size: 11pt; margin-top: 6pt; } h6 { font-size: 10pt; margin-top: 4pt; }
p { margin: 0 0 8pt 0; text-align: justify; text-justify: inter-word; orphans: 2; widows: 2; }
ul { list-style: disc; margin: 0 0 8pt 0; padding-left: 20pt; }
ol { list-style: decimal; margin: 0 0 8pt 0; padding-left: 20pt; }
li { margin: 0 0 4pt 0; text-align: justify; }
div { text-align: justify; text-justify: inter-word; }
strong { font-weight: bold; } em { font-style: italic; }
blockquote { border-left: 3px solid #d1d5db; padding-left: 12pt; margin: 8pt 0; color: #555; }
table { width: 100%; border-collapse: collapse; margin: 12pt 0; page-break-inside: avoid; }
th { background: #f3f4f6; font-weight: 600; text-align: left; padding: 6pt 8pt; border: 1px solid #d1d5db; font-size: 11pt; }
td { padding: 6pt 8pt; border: 1px solid #d1d5db; font-size: 11pt; text-align: left; vertical-align: top; }
img { max-width: 100%; height: auto; display: block; margin: 8pt auto; }
hr { border: none; border-top: 1px solid #d1d5db; margin: 16pt 0; }
a { color: inherit; text-decoration: underline; }
.page-break { page-break-after: always; break-after: page; display: block; height: 0; overflow: hidden; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } h1, h2, h3 { page-break-after: avoid; } table, figure { page-break-inside: avoid; } }
`;

  pw.document.write(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>${escapeHtml(doc.title)}</title><style>${css}</style></head>
<body>${bodyHtml}<script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
  pw.document.close();
}

// ============================================================
// MARKDOWN → HTML
// ============================================================

function markdownToBasicHtml(md: string): string {
  let h = md;
  h = h.replace(/\s*-{2,}PAGE-{2,}\s*/gi, '<div class="page-break"></div>');
  h = h.replace(/^###### (.+)$/gm, "<h6>$1</h6>");
  h = h.replace(/^##### (.+)$/gm,  "<h5>$1</h5>");
  h = h.replace(/^#### (.+)$/gm,   "<h4>$1</h4>");
  h = h.replace(/^### (.+)$/gm,    "<h3>$1</h3>");
  h = h.replace(/^## (.+)$/gm,     "<h2>$1</h2>");
  h = h.replace(/^# (.+)$/gm,      "<h1>$1</h1>");
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  h = h.replace(/\*\*(.+?)\*\*/g,     "<strong>$1</strong>");
  h = h.replace(/\*(.+?)\*/g,         "<em>$1</em>");
  h = h.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  h = h.replace(/^(\d+(?:\.\d+)*)\.? (.+)$/gm, (_, num, text) => {
    const depth = num.split(".").length;
    return `<div style="margin:0 0 4pt ${(depth - 1) * 16}pt;text-align:justify;">${num}. ${text}</div>`;
  });
  h = h.replace(/^[-*] (.+)$/gm, '<li style="text-align:justify;">$1</li>');
  h = h.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul style="list-style-type:disc;padding-left:20pt;margin-bottom:8pt;">${m}</ul>`);
  h = h.replace(/\|(.+)\|\n\|[-|: ]+\|\n((?:\|.+\|\n?)*)/g, (_, hr: string, br: string) => {
    const ths = hr.split("|").map((c: string) => `<th style="background:#f9fafb;font-weight:600;padding:6pt;border:1px solid #e5e7eb;">${c.trim()}</th>`).join("");
    const trs = br.trim().split("\n").map((r: string) =>
      `<tr>${r.split("|").filter((c: string) => c.trim()).map((c: string) => `<td style="padding:6pt;border:1px solid #e5e7eb;">${c.trim()}</td>`).join("")}</tr>`
    ).join("");
    return `<table style="width:100%;border-collapse:collapse;margin:12pt 0;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });
  h = h.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" />');
  h = h.replace(/\[(.+?)\]\((.+?)\)/g,  '<a href="$2">$1</a>');
  h = applyColorSyntax(h);
  h = h.replace(/^---$/gm, "<hr />");
  h = h.split("\n\n").map(b => {
    const t = b.trim();
    if (!t) return "";
    if (t.startsWith("<h") || t.startsWith("<ul") || t.startsWith("<div") ||
        t.startsWith("<table") || t.startsWith("<blockquote") || t.startsWith("<hr") || t.startsWith("<img")) return t;
    return `<p style="text-align:justify;">${t.replace(/\n/g, "<br />")}</p>`;
  }).join("\n");
  return h;
}

// ============================================================
// EVENT COMPTE RENDU VIEW — Raccourci rapide depuis Événements
// ============================================================

function EventCompteRenduView({
  eventData,
  onCancel,
  onCreated,
}: {
  eventData: EventData;
  onCancel: () => void;
  onCreated: (doc: DocumentItem) => void;
}) {
  const user = useCurrentUser();
  const { toast } = useToast();

  const [title, setTitle] = useState(eventData.title);
  const [description, setDescription] = useState(eventData.description ?? '');
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [participantStatuses, setParticipantStatuses] = useState<Record<string, ParticipantStatus>>(
    () => {
      const init: Record<string, ParticipantStatus> = {};
      for (const p of eventData.participants) {
        init[p.id] = eventData.type === 'HYBRIDE' ? 'ABSENT' : 'PRESENT';
      }
      return init;
    }
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventDate = new Date(eventData.startAt);
  const formattedDate = format(eventDate, "d MMMM yyyy 'à' HH'h'mm", { locale: fr });

  const TYPE_LABELS: Record<string, string> = {
    PRESENTIEL: 'Présentiel',
    EN_LIGNE: 'En ligne',
    HYBRIDE: 'Hybride',
  };

  const CAT_LABELS: Record<string, string> = {
    REUNION: 'Réunion',
    FORMATION: 'Formation',
  };

  const addKeyPoint = () =>
    setKeyPoints((prev) => [...prev, { id: crypto.randomUUID(), title: '', description: '' }]);
  const removeKeyPoint = (id: string) =>
    setKeyPoints((prev) => prev.filter((kp) => kp.id !== id));
  const updateKeyPoint = (id: string, field: 'title' | 'description', value: string) =>
    setKeyPoints((prev) =>
      prev.map((kp) => (kp.id === id ? { ...kp, [field]: value } : kp))
    );

  function setStatus(participantId: string, status: ParticipantStatus) {
    setParticipantStatuses((prev) => ({ ...prev, [participantId]: status }));
  }

  function getStatusLabel(status: ParticipantStatus): string {
    if (status === 'PRESENTIEL') return 'Présentiel';
    if (status === 'EN_LIGNE') return 'En ligne';
    if (status === 'PRESENT') return 'Présent';
    return 'Absent';
  }

  function buildParticipantTable(): string {
    const rows = eventData.participants.map((p) => {
      const status = participantStatuses[p.id];
      const statusLabel = getStatusLabel(status ?? 'ABSENT');
      return `| ${p.employee.firstName} ${p.employee.lastName} | ${p.employee.position} | ${p.employee.department} | ${statusLabel} |`;
    });
    return [
      '| Nom | Poste | Département | Présence |',
      '|---|---|---|---|',
      ...rows,
    ].join('\n');
  }

  async function handleGenerate() {
    if (!title.trim()) {
      toast({ title: 'Erreur', description: 'Le titre est obligatoire.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    setError(null);

    const participantTable = buildParticipantTable();
    const presentCount = Object.values(participantStatuses).filter(
      (s) => s === 'PRESENT' || s === 'PRESENTIEL' || s === 'EN_LIGNE'
    ).length;
    const absentCount = eventData.participants.length - presentCount;

    const contextDescription = [
      `Type d'événement : ${TYPE_LABELS[eventData.type] ?? eventData.type}`,
      `Catégorie : ${CAT_LABELS[eventData.category] ?? eventData.category}`,
      `Date : ${formattedDate}`,
      `Durée : ${eventData.durationMins} minutes`,
      eventData.location ? `Lieu : ${eventData.location}` : null,
      eventData.platform ? `Plateforme : ${eventData.platform}` : null,
      eventData.reportResponsible
        ? `Responsable rapport : ${eventData.reportResponsible.firstName} ${eventData.reportResponsible.lastName}`
        : null,
      `Participants : ${eventData.participants.length} inscrits (${presentCount} présents, ${absentCount} absents)`,
      '',
      description ? `Description de l'événement : ${description}` : null,
      '',
      keyPoints.length > 0
        ? `Points abordés :\n${keyPoints.map((kp, i) => `${i + 1}. ${kp.title}${kp.description ? ` : ${kp.description}` : ''}`).join('\n')}`
        : null,
      '',
      `Liste des participants :\n${participantTable}`,
    ]
      .filter(Boolean)
      .join('\n');

    const eventKeyPoints: KeyPoint[] = [
      {
        id: '1',
        title: 'Page de couverture',
        description: `Titre de l'événement, date, type, responsable rapport, organisé par UDN Bureau Nord`,
      },
      {
        id: '2',
        title: 'Contenu du compte rendu',
        description:
          keyPoints.length > 0
            ? keyPoints.map((kp) => `${kp.title}${kp.description ? ` : ${kp.description}` : ''}`).join('; ')
            : 'Résumé des échanges, décisions prises, actions à suivre.',
      },
      {
        id: '3',
        title: 'Liste des participants',
        description: `Tableau complet des participants avec leur statut de présence (${getStatusLabel('PRESENT' as ParticipantStatus)}, ${eventData.type === 'HYBRIDE' ? 'Présentiel, En ligne, ' : ''}Absent).`,
      },
    ];

    try {
      // Étape 1 : Générer le plan
      const planRes = await fetch('/api/documents/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'compterendu',
          variant: 'reunion',
          title: title.trim(),
          description: contextDescription,
          keyPoints: eventKeyPoints,
          pageCount: 3,
        }),
      });
      if (!planRes.ok) throw new Error('Erreur lors de la génération du plan');
      const planData = await planRes.json();

      // Étape 2 : Générer le document
      const genRes = await fetch('/api/documents/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'compterendu',
          variant: 'reunion',
          title: title.trim(),
          description: contextDescription,
          keyPoints: eventKeyPoints,
          plan: planData.plan,
          pageCount: 3,
        }),
      });
      if (!genRes.ok) {
        const d = await genRes.json();
        throw new Error(d.error || 'Erreur lors de la génération');
      }
      const genData = await genRes.json();

      // Ajouter la page participants à la fin du contenu
      const participantPageContent = [
        '\n\n--PAGE--\n',
        '## Liste des participants\n',
        `**Événement :** ${title}  `,
        `**Date :** ${formattedDate}  `,
        `**Type :** ${TYPE_LABELS[eventData.type] ?? eventData.type}  `,
        `**Participants inscrits :** ${eventData.participants.length} | **Présents :** ${presentCount} | **Absents :** ${absentCount}`,
        '',
        participantTable,
      ].join('\n');

      const finalContent = (genData.content || '') + participantPageContent;

      const docData = {
        title: title.trim(),
        type: 'compterendu' as DocumentType,
        variant: 'reunion',
        content: finalContent,
        preview: generatePreview(finalContent),
        meetingId: eventData.id,
        workflowStatus: 'en_attente',
        visibility: 'prive',
      };

      // Sauvegarder les présences dans la base de données
      const attendances = eventData.participants.map(p => ({
        participantId: p.id,
        status: participantStatuses[p.id] || 'ABSENT'
      }));
      await fetch(`/api/meetings/${eventData.id}/attendance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendances })
      });

      const createdDoc = await createDocument(docData);
      if (!createdDoc) throw new Error('Erreur lors de la sauvegarde');

      toast({
        title: 'Compte rendu généré',
        description: `"${createdDoc.title}" a été créé avec succès.`,
      });
      onCreated(createdDoc);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      setError(msg);
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  }

  const canGenerate = title.trim().length > 0 && !isGenerating;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-lg">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Compte rendu d'événement</h1>
              <p className="text-xs text-gray-500">Raccourci rapide — IA génère un document 3 pages</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Bannière événement */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-start gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-semibold">
              <ClipboardCheck className="w-3.5 h-3.5" />
              {CAT_LABELS[eventData.category] ?? eventData.category}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white text-emerald-700 px-3 py-1 text-xs font-medium">
              {eventData.type === 'PRESENTIEL' && <Building2 className="w-3 h-3" />}
              {eventData.type === 'EN_LIGNE' && <Globe className="w-3 h-3" />}
              {eventData.type === 'HYBRIDE' && <Monitor className="w-3 h-3" />}
              {TYPE_LABELS[eventData.type] ?? eventData.type}
            </span>
          </div>
          <h2 className="text-lg font-bold text-emerald-950 mb-1">{eventData.title}</h2>
          <div className="flex flex-wrap gap-4 text-sm text-emerald-700">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {eventData.participants.length} participant{eventData.participants.length !== 1 ? 's' : ''}
            </span>
            {eventData.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {eventData.location}
              </span>
            )}
            {eventData.platform && (
              <span className="flex items-center gap-1.5">
                <Video className="w-4 h-4" />
                {eventData.platform}
              </span>
            )}
          </div>
        </div>

        {/* Titre du document */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">📄 Titre du compte rendu</h3>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du compte rendu"
            className="h-12 rounded-xl border-gray-200 bg-gray-50 text-base"
          />
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description / contexte</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexte de l'événement, objectifs..."
              className="min-h-[80px] rounded-xl border-gray-200 bg-gray-50 text-sm resize-none"
            />
          </div>
        </div>

        {/* Points abordés */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">📋 Points abordés</h3>
            <Button variant="outline" size="sm" onClick={addKeyPoint} className="rounded-lg text-xs">
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              Ajouter un point
            </Button>
          </div>
          <AnimatePresence>
            {keyPoints.map((kp, i) => (
              <motion.div
                key={kp.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="mb-3 p-4 bg-gray-50 rounded-xl border border-gray-200"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                    {i + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Titre du point"
                      value={kp.title}
                      onChange={(e) => updateKeyPoint(kp.id, 'title', e.target.value)}
                      className="h-10 rounded-lg border-gray-200 bg-white text-sm font-medium"
                    />
                    <Textarea
                      placeholder="Description (optionnel)"
                      value={kp.description}
                      onChange={(e) => updateKeyPoint(kp.id, 'description', e.target.value)}
                      className="min-h-[50px] rounded-lg border-gray-200 bg-white text-sm resize-none"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeKeyPoint(kp.id)}
                    className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-500 shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {keyPoints.length === 0 && (
            <div className="text-center py-6 text-gray-400">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Ajoutez les points discutés lors de l'événement (optionnel)</p>
            </div>
          )}
        </div>

        {/* Présences des participants */}
        {eventData.participants.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">👥 Présences des participants</h3>
              {eventData.type === 'HYBRIDE' && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  🔀 Événement hybride — indiquez si chaque participant était en <strong>présentiel</strong>, <strong>en ligne</strong> ou <strong>absent</strong>.
                </p>
              )}
              {eventData.type !== 'HYBRIDE' && (
                <p className="text-xs text-slate-500">
                  Cochez les participants présents à cet événement ({TYPE_LABELS[eventData.type]}).
                </p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {eventData.participants.map((p) => {
                const status = participantStatuses[p.id];
                const initials = `${p.employee.firstName.charAt(0)}${p.employee.lastName.charAt(0)}`.toUpperCase();

                return (
                  <div key={p.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 shadow-sm">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {p.employee.firstName} {p.employee.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{p.employee.position}</p>
                      </div>
                    </div>

                    {/* Boutons de statut selon le type d'événement */}
                    {eventData.type === 'HYBRIDE' ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setStatus(p.id, 'PRESENTIEL')}
                          className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium border transition-all ${
                            status === 'PRESENTIEL'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
                          }`}
                        >
                          <Building2 className="w-3 h-3" />
                          Présentiel
                        </button>
                        <button
                          onClick={() => setStatus(p.id, 'EN_LIGNE')}
                          className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium border transition-all ${
                            status === 'EN_LIGNE'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700'
                          }`}
                        >
                          <Globe className="w-3 h-3" />
                          En ligne
                        </button>
                        <button
                          onClick={() => setStatus(p.id, 'ABSENT')}
                          className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium border transition-all ${
                            status === 'ABSENT'
                              ? 'bg-red-500 text-white border-red-500 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
                          }`}
                        >
                          <UserX className="w-3 h-3" />
                          Absent
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStatus(p.id, 'PRESENT')}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium border transition-all ${
                            status === 'PRESENT'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Présent
                        </button>
                        <button
                          onClick={() => setStatus(p.id, 'ABSENT')}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium border transition-all ${
                            status === 'ABSENT'
                              ? 'bg-red-500 text-white border-red-500 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
                          }`}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Absent
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Résumé + erreur */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <Button variant="outline" onClick={onCancel} className="rounded-xl" disabled={isGenerating}>
            Annuler
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg rounded-xl px-6"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Génération en cours…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Générer le compte rendu
              </>
            )}
          </Button>
        </div>
      </main>
    </motion.div>
  );
}

// ============================================================
// MAIN
// ============================================================

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function DocumentAssistant() {
  const [view, setView] = useState<AppView>("dashboard");
  const [currentDoc, setCurrentDoc] = useState<DocumentItem | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const mounted = useIsMounted();

  // Détecter si un événement est en attente depuis la page Événements
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = sessionStorage.getItem('evenement_compte_rendu');
      if (raw) {
        const data: EventData & { existingReportId?: string } = JSON.parse(raw);
        sessionStorage.removeItem('evenement_compte_rendu');
        
        if (data.existingReportId) {
          fetch(`/api/documents/${data.existingReportId}`)
            .then(res => res.json())
            .then(doc => {
              setCurrentDoc(doc);
              setView('editor');
            })
            .catch(err => {
              console.error('Erreur chargement document:', err);
              setEventData(data);
              setView('event-compterendu');
            });
        } else {
          setEventData(data);
          setView('event-compterendu');
        }
      }
    } catch {
      sessionStorage.removeItem('evenement_compte_rendu');
    }
  }, [mounted]);

  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-sm text-gray-500">Chargement...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AnimatePresence mode="wait">
        {view === "dashboard" && (
          <DashboardView key="dashboard"
            onNewDocument={() => setView("create")}
            onOpenDocument={(d) => { setCurrentDoc(d); setView("editor"); }} />
        )}
        {view === "create" && (
          <CreateView key="create"
            onCancel={() => setView("dashboard")}
            onCreated={(d) => { setCurrentDoc(d); setView("editor"); }} />
        )}
        {view === "editor" && currentDoc && (
          <EditorView key={`editor-${currentDoc.id}`}
            document={currentDoc}
            onBack={() => { setCurrentDoc(null); setView("dashboard"); }} />
        )}
        {view === "event-compterendu" && eventData && (
          <EventCompteRenduView
            key="event-compterendu"
            eventData={eventData}
            onCancel={() => { setEventData(null); setView("dashboard"); }}
            onCreated={(d) => { setCurrentDoc(d); setView("editor"); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}




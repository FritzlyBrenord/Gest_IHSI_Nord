// ============================================================
// LETTER UTILS — extraits de documents.tsx
// ============================================================

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DocumentType } from "@/types/document";
import { LETTER_VARIANT_GUIDES } from "./constants";
import { ParsedLetter, LetterFields } from "./types";

// ============================================================
// HELPERS
// ============================================================

export function getLetterGuide(variant: string | null) {
  return variant ? LETTER_VARIANT_GUIDES[variant] ?? null : null;
}

export function parseDocumentDateInput(value: string | undefined | null) {
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

export function createDefaultLetterFields(): LetterFields {
  return {
    place: "",
    date: format(new Date(), "d MMMM yyyy", { locale: fr }),
    senderName: "", senderAddress: "", senderPhone: "", senderEmail: "",
    recipientName: "", recipientRole: "", recipientOrganization: "", recipientAddress: "",
    subject: "", body: "", closing: "", signatureName: "",
  };
}

export function cleanLine(line: string) {
  return line.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function cleanDocumentPreview(value: string) {
  return value
    .replace(/\[\[(?:header:(?:true|false)|place:[^\]]*|date:[^\]]*|.*?)]\]/gi, " ")
    .replace(/\[\[(.*?)\]\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractHeaderMetadata(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const match = normalized.match(/^\[\[header:(true|false)\]\]\s*(?:\n|$)/i);
  const showHeader = match ? match[1].toLowerCase() === "true" : true;
  const strippedContent = match
    ? normalized.replace(/^\[\[header:(true|false)\]\]\s*(?:\n|$)/i, "")
    : normalized;
  return { showHeader, strippedContent };
}

export function parseLetterContent(content: string): ParsedLetter {
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

export function composeLetterContentFromParsed(letter: ParsedLetter, improvedBody: string): string {
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

export function sanitizeLetterBodyStrict(content: string, letter?: ParsedLetter): string {
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

export function toggleDocHeader(content: string, type: DocumentType): string {
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

export function appendImageMarkdown(content: string, type: DocumentType, fileName: string): string {
  const imageBlock = `\n![${fileName}](image-upload)\n*Figure : ${fileName}*\n`;
  if (type === "letter") {
    const letter = parseLetterContent(content);
    const nextBody = `${letter.body.join("\n\n")}${letter.body.length ? "\n\n" : ""}${imageBlock.trim()}`;
    return composeLetterContentFromParsed(letter, nextBody);
  }
  return `${content}${imageBlock}`;
}

export function getSignatureName(signature: string[]) {
  const lines = signature.map(cleanLine).filter(Boolean);
  return lines.filter((line) => !/^_{3,}$/.test(line)).at(-1) ?? "";
}

export function applyColorSyntax(html: string) {
  return html.replace(/\[\[color:([^\]]+)\]\]([\s\S]*?)\[\[\/color\]\]/gi,
    (_match, color: string, inner: string) => `<span style="color:${escapeHtml(color)};">${inner}</span>`
  );
}

"use client";

// ============================================================
// PDF EXPORT + MARKDOWN → HTML — extraits de documents.tsx
// ============================================================

import { DocumentItem, DocumentType } from "@/types/document";
import { UserInfo } from "./types";
import { parseLetterContent, extractHeaderMetadata, getSignatureName, escapeHtml } from "./letter-utils";
import { buildOfficialHeaderHtml } from "@/components/documents/official-header";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ============================================================
// MARKDOWN → HTML
// ============================================================

export function markdownToBasicHtml(md: string): string {
  let h = md;
  h = h.replace(/\s*-{2,}PAGE-{2,}\s*/gi, '<div class="page-break"></div>');
  h = h.replace(/^###### (.+)$/gm, "<h6>$1</h6>");
  h = h.replace(/^##### (.+)$/gm,  "<h5>$1</h5>");
  h = h.replace(/^#### (.+)$/gm,   "<h4>$1</h4>");
  h = h.replace(/^### (.+)$/gm,    "<h3 style=\"font-size:13pt;font-weight:bold;margin-top:10pt;margin-bottom:6pt;text-align:left;\">$1</h3>");
  h = h.replace(/^## (.+)$/gm,     "<h2 style=\"font-size:15pt;font-weight:bold;margin-top:14pt;margin-bottom:6pt;text-align:left;\">$1</h2>");
  h = h.replace(/^# (.+)$/gm,      "<h1>$1</h1>");
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  h = h.replace(/\*\*(.+?)\*\*/g,     "<strong>$1</strong>");
  h = h.replace(/\*(.+?)\*/g,         "<em>$1</em>");
  h = h.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  h = h.replace(/^(\d+(?:\.\d+)*)\. (.+)$/gm, (_, num, text) => {
    const depth = num.split(".").length;
    return `<div style="margin:0 0 4pt ${(depth - 1) * 16}pt;text-align:justify;">${num}. ${text}</div>`;
  });
  h = h.replace(/^[-*] (.+)$/gm, '<li style="text-align:justify;">$1</li>');
  h = h.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul style="list-style-type:disc;padding-left:20pt;margin-bottom:8pt;">${m}</ul>`);
  h = h.replace(/\|(.+)\|\n\|[-|: ]+\|\n((?:\|.+\|\n?)*)/g, (_, hr: string, br: string) => {
    const ths = hr.split("|").map((c: string) => `<th style="background:#1a1a1a;color:white;font-weight:600;padding:7pt 10pt;font-size:11pt;text-align:left;">${c.trim()}</th>`).join("");
    const trs = br.trim().split("\n").map((r: string, i: number) =>
      `<tr style="background:${i % 2 === 0 ? 'transparent' : '#f9fafb'};">${r.split("|").filter((c: string) => c.trim()).map((c: string) => `<td style="padding:6pt 10pt;border:1px solid #d1d5db;font-size:11pt;text-align:left;">${c.trim()}</td>`).join("")}</tr>`
    ).join("");
    return `<table style="width:100%;border-collapse:collapse;margin:12pt 0;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });
  h = h.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;display:block;margin:8pt auto;" />');
  h = h.replace(/\[(.+?)\]\((.+?)\)/g,  '<a href="$2">$1</a>');
  h = applyColorSyntax(h);
  // Suppression de la conversion --- en <hr /> pour éviter les lignes horizontales
  // h = h.replace(/^---$/gm, "<hr />");
  h = h.split("\n\n").map(b => {
    const t = b.trim();
    if (!t) return "";
    if (t.startsWith("<h") || t.startsWith("<ul") || t.startsWith("<div") ||
        t.startsWith("<table") || t.startsWith("<blockquote") || t.startsWith("<hr") || t.startsWith("<img")) return t;
    return `<p style="margin:0 0 8pt 0;text-align:justify;text-justify:inter-word;line-height:1.5;">${t.replace(/\n/g, "<br />")}</p>`;
  }).join("\n");
  return h;
}

function applyColorSyntax(html: string) {
  return html.replace(/\[\[color:([^\]]+)\]\]([\s\S]*?)\[\[\/color\]\]/gi,
    (_match, color: string, inner: string) => `<span style="color:${escapeHtml(color)};">${inner}</span>`
  );
}

// ============================================================
// PDF EXPORT
// ============================================================

export function exportToPDF(doc: DocumentItem, user?: UserInfo | null) {
  const pw = window.open("", "_blank");
  if (!pw) return;

  const { showHeader, strippedContent } = extractHeaderMetadata(doc.content);
  const isSpecialDoc = doc.type === "compterendu" || doc.type === "report";
  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const coverTitle = doc.type === "compterendu" ? "COMPTE RENDU DE FORMATION" : "RAPPORT";
  const headerBlockHtml = buildOfficialHeaderHtml({ showRule: false });

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
      const authorName = doc.employer ? `${doc.employer.firstName} ${doc.employer.lastName}` : "...";
      const authorPosition = doc.employer?.poste || "...";
      bodyHtml += `
        <div class="cover-page">
          ${showHeader ? headerBlockHtml : ""}
          <div class="cover-center">
            <div style="text-align:center;width:100%;">
              <div style="font-size:16pt;font-weight:bold;text-align:center;margin:0 auto;text-transform:uppercase;margin-bottom:32pt;">${coverTitle}</div>
              ${doc.title ? `<div style="font-size:13pt;font-weight:bold;text-align:center;margin:0 auto 48pt auto;max-width:70%;font-style:italic;">"${escapeHtml(doc.title)}"</div>` : ""}
              <div style="font-size:12pt;font-weight:bold;margin-bottom:64pt;text-align:center;">Bureau Nord | ${dateStr}</div>
            </div>
            <div style="width:100%;margin-top:80pt;">
              <div style="font-weight:bold;font-size:12pt;">Préparé par :</div>
              <div style="font-weight:bold;font-size:12pt;">${escapeHtml(authorName)}</div>
              <div style="font-size:11pt;text-transform:uppercase;font-style:italic;white-space:pre-line;">${escapeHtml(authorPosition)}</div>
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
hr { display: none; }
a { color: inherit; text-decoration: underline; }
.page-break { page-break-after: always; break-after: page; display: block; height: 0; overflow: hidden; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } h1, h2, h3 { page-break-after: avoid; } table, figure { page-break-inside: avoid; } }
`;

  pw.document.write(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>${escapeHtml(doc.title)}</title><style>${css}</style></head>
<body>${bodyHtml}<script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
  pw.document.close();
}

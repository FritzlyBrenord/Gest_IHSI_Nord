import { NextResponse } from "next/server";
import HTMLtoDOCX from "html-to-docx";
import fs from "fs";
import path from "path";
import { buildOfficialHeaderHtml } from "@/components/documents/official-header";

function getImageBase64(fileName: string): string {
  try {
    const filePath = path.join(process.cwd(), "public", fileName);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const mimeType = fileName.toLowerCase().endsWith(".webp") ? "image/webp" : "image/png";
      return `data:${mimeType};base64,${buffer.toString("base64")}`;
    }
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error);
  }
  return "";
}

// -------------------------------------------------------
// Markdown → HTML
// -------------------------------------------------------
function markdownToHtml(md: string): string {
  let h = md;
  // Convert ---PAGE--- markers to page breaks
  h = h.replace(/\s*-{2,}PAGE-{2,}\s*/gi, '<div style="page-break-after:always;break-after:page;"></div>');
  h = h.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  h = h.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  h = h.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\*(.+?)\*/g, "<em>$1</em>");
  h = h.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  h = h.replace(/^- (.+)$/gm, "<li>$1</li>");
  h = h.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  h = h.replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (_: string, hr: string, br: string) => {
    const ths = hr.split("|").filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join("");
    const trs = br.trim().split("\n").map((r: string) => `<tr>${r.split("|").filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join("")}</tr>`).join("");
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });
  h = h.replace(/^---$/gm, "<hr />");
  h = h.replace(/\[\[color:([^\]]+)\]\]([\s\S]*?)\[\[\/color\]\]/gi, (_match, color: string, inner: string) => {
    return `<span style="color:${color};">${inner}</span>`;
  });
  h = h.split("\n\n").map((b: string) => {
    const t = b.trim();
    if (!t) return "";
    if (t.startsWith("<h") || t.startsWith("<ul") || t.startsWith("<table") ||
        t.startsWith("<blockquote") || t.startsWith("<hr") || t.startsWith("<img")) return t;
    return `<p>${t.replace(/\n/g, "<br />")}</p>`;
  }).join("\n");
  return h;
}

function extractHeaderMetadata(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const match = normalized.match(/^\[\[header:(true|false)\]\]\s*(?:\n|$)/i);
  const showHeader = match ? match[1].toLowerCase() === "true" : true;
  const strippedContent = match ? normalized.replace(/^\[\[header:(true|false)\]\]\s*(?:\n|$)/i, "") : normalized;
  return { showHeader, strippedContent };
}

// -------------------------------------------------------
// Letter parser — reads the format:
//   Expéditeur: ...
//   Destinataire: ...
//   Objet: ...
//   Formule de politesse: ...
//   Signature: ...
// -------------------------------------------------------
function parseLetterForDocx(content: string) {
  const norm = content.replace(/\r\n/g, "\n").trim();

  const place = norm.match(/^\[\[place:(.*?)\]\]$/im)?.[1]?.trim() ?? "";
  const date  = norm.match(/^\[\[date:(.*?)\]\]$/im)?.[1]?.trim() ?? "";

  // Strip meta lines
  const stripped = norm.split("\n").filter(l => !/^\[\[.*?\]\]$/i.test(l.trim())).join("\n");

  function capture(label: string, stops: string[]) {
    const stopPat = stops.length ? `(?=\\n(?:${stops.join("|")})\\s*:?)` : "$";
    const re = new RegExp(`${label}\\s*:?\\s*([\\s\\S]*?)${stopPat}`, "i");
    return stripped.match(re)?.[1]?.trim() ?? "";
  }

  const sender   = capture("Expéditeur", ["Destinataire", "Objet"]);
  const recipient = capture("Destinataire", ["Objet", "Madame", "Monsieur"]);
  const subject  = capture("Objet", ["Madame", "Monsieur", "Formule de politesse", "Signature"]);
  const closing  = capture("Formule de politesse", ["Signature"]);
  const signature = capture("Signature", []);

  // Body = text between salutation and closing formula
  const salMatch = stripped.match(/(Madame,?\s*Monsieur,?|Monsieur,?\s*Madame,?|Monsieur\s+le\s+\w+,?|Madame\s+la\s+\w+,?)/i);
  const salutation = salMatch?.[1]?.trim() ?? "Madame, Monsieur,";

  let body = stripped;
  // Remove header sections
  [["Expéditeur", sender], ["Destinataire", recipient], ["Objet", subject],
   ["Formule de politesse", closing], ["Signature", signature]].forEach(([lbl, val]) => {
    if (val) body = body.replace(new RegExp(`${lbl}\\s*:?\\s*${val.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}`, "i"), "");
  });
  const salIdx = body.search(new RegExp(salutation.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "i"));
  if (salIdx >= 0) body = body.slice(salIdx + salutation.length);
  if (closing) { const ci = body.indexOf(closing); if (ci >= 0) body = body.slice(0, ci); }
  body = body.trim();

  return { place, date, sender, recipient, subject, salutation, body, closing, signature };
}

function letterToHtml(content: string, hasHeader: boolean): string {
  const l = parseLetterForDocx(content);

  const senderHtml  = l.sender.split("\n").filter(Boolean).join("<br/>");
  const recipHtml   = l.recipient.split("\n").filter(Boolean).join("<br/>");
  const dateStr = [l.place, l.date ? `le ${l.date}` : ""].filter(Boolean).join(", ");
  
  // Format body paragraphs with Markdown processor
  const bodyHtml = l.body.split(/\n{2,}/).filter(Boolean)
    .map((p: string) => `<p style="text-align:justify;margin:0 0 10pt 0;">${markdownToHtml(p.trim())}</p>`).join("");

  const headerHtml = hasHeader
    ? buildOfficialHeaderHtml({
        logoSrc: getImageBase64("logo.webp"),
        emblemSrc: getImageBase64("palmis.webp"),
        showRule: true,
      })
    : "";

  return `
<div style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;color:#111;padding:2.54cm;">
  ${headerHtml}
  <table width="100%" style="margin-bottom:24pt;border:none;border-collapse:collapse;">
    <tr>
      <td style="vertical-align:top;border:none;">${senderHtml}</td>
      <td style="text-align:right;vertical-align:top;border:none;white-space:nowrap;">${dateStr}</td>
    </tr>
  </table>
  ${recipHtml ? `<div style="margin-bottom:24pt;margin-left:50%;">${recipHtml}</div>` : ""}
  ${l.subject ? `<p style="margin-bottom:24pt;"><strong>Objet : ${l.subject}</strong></p>` : ""}
  <p style="margin-bottom:16pt;">${l.salutation}</p>
  <div style="text-align:justify;">${bodyHtml}</div>
  ${l.closing ? `<p style="margin-top:24pt;text-align:justify;">${l.closing}</p>` : ""}
  ${l.signature ? `<div style="margin-top:72pt;text-align:right;"><p style="border-top:1px solid #111;display:inline-block;padding-top:8pt;min-width:160pt;">${l.signature.split("\n").filter(Boolean).join("<br/>")}</p></div>` : ""}
</div>`;
}

function reportToHtml(content: string, hasHeader: boolean, title: string, type: string): string {
  const headerHtml = hasHeader
    ? buildOfficialHeaderHtml({
        logoSrc: getImageBase64("logo.webp"),
        emblemSrc: getImageBase64("palmis.webp"),
        showRule: true,
      })
    : "";

  // Handle old documents that still have the AI-generated title block separated by ---
  const parts = content.split(/\n---\n/);
  const actualContent = parts.length >= 2 ? parts.slice(1).join("\n---\n") : content;

  const coverTitle = type === "compterendu" ? "COMPTE RENDU DE FORMATION" : "RAPPORT";
  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  
  const coverHtml = `
    <div style="text-align:center; padding-top: 60pt; padding-bottom: 40pt;">
      <h1 style="font-size:16pt; font-weight:bold; text-transform:uppercase; margin-bottom:32pt;">${coverTitle}</h1>
      ${title ? `<h2 style="font-size:14pt; font-weight:bold; margin-bottom:48pt;">${title}</h2>` : ""}
      <p style="font-size:12pt; font-weight:bold; margin-top:80pt;">${dateStr}</p>
    </div>
  `;

  return `
<div style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;color:#111;padding:2.54cm;text-align:justify;">
  <div style="page-break-after:always;">
    ${headerHtml}
    ${coverHtml}
  </div>
  <div>
    ${markdownToHtml(actualContent)}
  </div>
</div>`;
}

// -------------------------------------------------------
// Route handler
// -------------------------------------------------------
export async function POST(request: Request) {
  try {
    const { type, variant, data } = await request.json();
    const content: string = data?.contenu ?? "";
    const title: string = data?.title ?? "";

    const { showHeader: hasHeader, strippedContent: cleanedContent } = extractHeaderMetadata(content);

    let htmlContent = "";

    if (type === "letter" || type === "letters") {
      htmlContent = letterToHtml(cleanedContent, hasHeader);
    } else {
      htmlContent = reportToHtml(cleanedContent, hasHeader, title, type);
    }

    const docxBuffer = await HTMLtoDOCX(htmlContent, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
      font: "Times New Roman",
      fontSize: 24, // 24 half-points = 12pt
    });

    return new NextResponse(docxBuffer as any, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${type}_${variant}.docx"`,
      },
    });
  } catch (error: any) {
    console.error("Export DOCX Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du fichier Word" },
      { status: 500 }
    );
  }
}

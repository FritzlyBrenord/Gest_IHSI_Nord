"use client";

// ============================================================
// LETTER PREVIEW — extrait de documents.tsx
// ============================================================

import React from "react";
import { OfficialHeader } from "@/components/documents/official-header";
import { parseLetterContent, getSignatureName } from "./letter-utils";
import { markdownToBasicHtml } from "./pdf-export";

export function LetterPreview({ content }: { content: string }) {
  const letter = parseLetterContent(content);
  const signatureName = getSignatureName(letter.signature);

  return (
    <div className="relative mx-auto bg-white shadow-lg border border-gray-200 rounded-sm w-full max-w-[612px] p-6 sm:p-[72px]"
      style={{ minHeight: "792px", fontFamily: "'Times New Roman', Georgia, serif", fontSize: "12pt", lineHeight: "1.5", textAlign: "justify" }}>
      {letter.showHeader && <div className="mb-6"><OfficialHeader /></div>}

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 mb-10">
        <div className="w-full sm:max-w-[45%] whitespace-pre-line break-words">{letter.sender.join("\n")}</div>
        <div className="text-left sm:text-right whitespace-pre-line w-full sm:max-w-[45%] sm:ml-auto break-words">{letter.date}</div>
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

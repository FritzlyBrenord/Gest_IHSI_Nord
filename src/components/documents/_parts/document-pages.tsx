"use client";

// ============================================================
// DOCUMENT PAGES + PAGINATED CONTENT — extraits de documents.tsx
// ============================================================

import React, { useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DocumentType } from "@/types/document";
import { OfficialHeader } from "@/components/documents/official-header";
import { LetterPreview } from "./letter-preview";
import { extractHeaderMetadata } from "./letter-utils";
import { markdownToBasicHtml } from "./pdf-export";
import { useCurrentUser } from "./use-current-user";

export function DocumentPages({ content, type, title, showPageNumbers = true, authorName, authorPosition }: {
  content: string; type: DocumentType; title?: string; showPageNumbers?: boolean;
  authorName?: string; authorPosition?: string;
}) {
  const user = useCurrentUser();
  const finalName = authorName || user?.name || "...";
  const finalPosition = authorPosition || user?.poste || "...";
  if (type === "letter") return <LetterPreview content={content} />;

  const { showHeader, strippedContent } = extractHeaderMetadata(content);
  const isSpecialDoc = type === "compterendu" || type === "report";

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden sm:overflow-visible">
      {/* Cover page for special docs */}
      <div className="relative mx-auto bg-white shadow-lg border border-gray-200 rounded-sm flex flex-col w-full max-w-[612px] p-6 sm:p-[72px]"
        style={{ minHeight: "792px", fontFamily: "'Times New Roman', Georgia, serif", fontSize: "12pt", lineHeight: "1.5", wordBreak: "break-word", overflowWrap: "break-word" }}>
        {showHeader && <div className="mb-4"><OfficialHeader /></div>}

        {isSpecialDoc ? (
          <>
            <div className="text-center w-full">
              <h1 className="font-bold uppercase mb-6" style={{ fontFamily: "'Times New Roman', Georgia, serif", fontSize: "16pt" }}>
                {type === "compterendu" ? "COMPTE RENDU DE FORMATION " : "RAPPORT"}
              </h1>
              {title && (
                <div className="font-bold text-center mx-auto mb-8 w-full sm:max-w-[80%]" style={{ fontSize: "13pt", fontStyle: "italic", wordBreak: "break-word" }}>
                  "{title}"
                </div>
              )}
              <div className="font-bold text-center" style={{ fontSize: "12pt" }}>
                Bureau Nord | {format(new Date(), "d MMMM yyyy", { locale: fr })}
              </div>
            </div>

            <div className="flex-1"></div>

            <div className="flex flex-col sm:flex-row items-start justify-between w-full gap-4" style={{ marginTop: "auto" }}>
              <div className="w-full">
                <div className="font-bold" style={{ fontSize: "12pt" }}>Préparé par :</div>
                <div className="font-bold break-words" style={{ fontSize: "12pt" }}>{finalName}</div>
                <div className="uppercase italic whitespace-pre-line break-words" style={{ fontSize: "11pt" }}>{finalPosition}</div>
              </div>
              <div className="font-bold sm:text-right w-full sm:w-auto" style={{ fontSize: "12pt" }}>
                {format(new Date(), "d MMMM yyyy", { locale: fr })}
              </div>
            </div>
          </>
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

      <PaginatedContent content={strippedContent} startPageNum={2} showPageNumbers={showPageNumbers} type={type} />
    </div>
  );
}

export function PaginatedContent({ content, startPageNum = 1, showPageNumbers = true, type }: {
  content: string; startPageNum?: number; showPageNumbers?: boolean; type?: DocumentType;
}) {
  const pages = useMemo(() => {
    const parts = content.split(/\s*-{2,}PAGE-{2,}\s*|\n?\\\nnewpage\n?/i).map(p => p.trim()).filter(Boolean);
    
    // Si pas de délimiteurs et que c'est un document spécial, diviser intelligemment
    if (parts.length === 1 && (type === "report" || type === "compterendu") && content.length > 2000) {
      const sections = content.split(/^## /gm);
      const newPages: string[] = [];
      let currentPage = "";
      
      for (let i = 0; i < sections.length; i++) {
        const section = i === 0 ? sections[i] : "## " + sections[i];
        if (currentPage.length + section.length > 2500) {
          newPages.push(currentPage.trim());
          currentPage = section;
        } else {
          currentPage += (currentPage ? "\n\n" : "") + section;
        }
      }
      if (currentPage.trim()) newPages.push(currentPage.trim());
      return newPages.length > 0 ? newPages : [content];
    }
    
    return parts.length > 0 ? parts : [content];
  }, [content, type]);

  return (
    <div className="space-y-8">
      {pages.map((pageContent, index) => (
        <div key={index} className="relative mx-auto bg-white shadow-lg border border-gray-200 rounded-sm w-full max-w-[612px] p-6 pb-12 sm:p-[72px] sm:pb-[80px]"
          style={{ minHeight: "792px", fontFamily: "'Times New Roman', Georgia, serif", fontSize: "12pt", lineHeight: "1.5", textAlign: "justify", wordBreak: "break-word", overflowWrap: "break-word" }}>
          <div dangerouslySetInnerHTML={{ __html: markdownToBasicHtml(pageContent) }} />
          {showPageNumbers && (
            <div className="absolute left-0 right-0 text-center" style={{ bottom: "24px", fontSize: "10pt", color: "#666" }}>
              — {startPageNum + index} —
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

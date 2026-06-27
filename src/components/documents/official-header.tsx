import React from "react";

export interface OfficialHeaderProps {
  className?: string;
  logoSrc?: string;
  emblemSrc?: string;
  titleTop?: string;
  titleBottom?: string;
  showRule?: boolean;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function OfficialHeader({
  className = "",
  logoSrc = "/logo.webp",
  emblemSrc = "/palmis.webp",
  titleTop = "Institut Haïtien",
  titleBottom = "de Statistique et d'Informatique",
  showRule = false,
}: OfficialHeaderProps) {
  return (
    <div className={`official-header ${className}`.trim()}>
      {/*
        Layout exact de l'image :
        - Groupe GAUCHE : [logo IHSI] [texte "Institut Haïtien / de Statistique..."]
        - ESPACE vide au milieu (flex-1)
        - Groupe DROITE : [emblème + "RÉPUBLIQUE D'HAÏTI" dessous]
      */}
      <div className="flex items-center justify-between">

        {/* GROUPE GAUCHE : logo + texte côte à côte */}
        <div className="flex items-center gap-3">
          <img
            src={logoSrc}
            alt="Logo IHSI"
            className="h-16 w-16 flex-shrink-0 object-contain sm:h-[72px] sm:w-[72px]"
          />
          <div className="flex flex-col justify-center pt-7">
            <span className="font-serif text-[10px] font-bold leading-[1.5] text-neutral-900 sm:text-[10px]">
              {titleTop}
            </span>
            <span className="font-serif text-[10px] font-bold leading-[1.3] text-neutral-900 sm:text-[10px]">
              {titleBottom}
            </span>
          </div>
        </div>

        {/* GROUPE DROITE : emblème + label "RÉPUBLIQUE D'HAÏTI" */}
        <div className="flex flex-col items-center justify-center ">
          <img
            src={emblemSrc}
            alt="Emblème de la République d'Haïti"
            className="h-16 w-16 flex-shrink-0 object-contain sm:h-[68px] sm:w-[68px]"
          />
          <span className="text-center text-[6px]  font-bold uppercase tracking-widest text-red-700 sm:text-[6px]">
            RÉPUBLIQUE D'HAÏTI
          </span>
        </div>

      </div>

      {showRule ? (
        <div className="mt-2 border-b border-neutral-300/80" />
      ) : null}
    </div>
  );
}

/* ─── HTML builder (pour injection docx / PDF) ─── */

export interface OfficialHeaderHtmlOptions {
  logoSrc?: string;
  emblemSrc?: string;
  titleTop?: string;
  titleBottom?: string;
  showRule?: boolean;
}

export function buildOfficialHeaderHtml({
  logoSrc = "/logo.webp",
  emblemSrc = "/palmis.webp",
  titleTop = "Institut Haïtien",
  titleBottom = "de Statistique et d'Informatique",
  showRule = false,
}: OfficialHeaderHtmlOptions = {}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const absoluteLogo = logoSrc.startsWith('http') || logoSrc.startsWith('data:') ? logoSrc : origin + logoSrc;
  const absoluteEmblem = emblemSrc.startsWith('http') || emblemSrc.startsWith('data:') ? emblemSrc : origin + emblemSrc;

  const logo = escapeHtml(absoluteLogo);
  const emblem = escapeHtml(absoluteEmblem);
  const top = escapeHtml(titleTop);
  const bottom = escapeHtml(titleBottom);

  return `
<div style="margin-bottom:10pt;">
  <div style="display:flex;align-items:center;justify-content:space-between;">

    <!-- Groupe gauche : logo IHSI + texte juste à côté -->
    <div style="display:flex;align-items:center;gap:10pt; p">
      <img src="${logo}" alt="Logo IHSI"
           style="width:64px;height:64px;object-fit:contain;flex-shrink:0;margin:0;" />
      <div style="display:flex;flex-direction:column;justify-content:center; margin-bottom:-15pt; ">
        <div style="font-family:'Times New Roman',Georgia,serif;font-size:10pt;
                    font-weight:700;line-height:1.3;color:#111827;">${top}</div>
        <div style="font-family:'Times New Roman',Georgia,serif;font-size:10pt;
                    font-weight:700;line-height:1.3;color:#111827;">${bottom}</div>
      </div>
    </div>

    <!-- Groupe droite : emblème + RÉPUBLIQUE D'HAÏTI -->
    <div style="display:flex;flex-direction:column;align-items:center;">
      <img src="${emblem}" alt="Emblème de la République d'Haïti"
           style="width:64px;height:64px;object-fit:contain;flex-shrink:0;margin:0;" />
      <span style="font-size:4.5pt;font-weight:700;letter-spacing:0.08em;
                   text-transform:uppercase;color:#b91c1c;text-align:center;">
        RÉPUBLIQUE D'HAÏTI
      </span>
    </div>

  </div>
  ${showRule ? '<div style="border-bottom:1px solid #d1d5db;margin-top:6pt;"></div>' : ""}
</div>`;

}
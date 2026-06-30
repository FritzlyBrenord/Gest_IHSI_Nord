"use client";

// ============================================================
// LETTER FORM EDITOR — extrait de documents.tsx
// ============================================================

import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ParsedLetter } from "./types";
import { parseLetterContent, composeLetterContentFromParsed } from "./letter-utils";

interface LetterFormEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
}

export function LetterFormEditor({ content, onChange, textareaRef, disabled = false }: LetterFormEditorProps) {
  const letter = useMemo(() => parseLetterContent(content), [content]);

  const updateField = (key: keyof ParsedLetter, value: any) => {
    if (disabled) return;
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
          <Textarea value={letter.sender.join("\n")} onChange={(e) => updateField("sender", e.target.value)} className="min-h-25 rounded-xl border-gray-200 text-sm resize-none" placeholder="Nom&#10;Adresse&#10;Tél (optionnel)" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Destinataire</label>
          <Textarea value={letter.recipient.join("\n")} onChange={(e) => updateField("recipient", e.target.value)} className="min-h-25 rounded-xl border-gray-200 text-sm resize-none" placeholder="Nom&#10;Fonction&#10;Organisation&#10;Adresse" />
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
        <Textarea ref={textareaRef} value={letter.body.join("\n\n")} onChange={(e) => updateField("body", e.target.value)} className="min-h-55 rounded-xl border-gray-200 text-sm font-sans leading-relaxed" placeholder="Rédigez le corps de la lettre ici..." />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Formule de politesse</label>
        <Textarea value={letter.closing} onChange={(e) => updateField("closing", e.target.value)} className="min-h-15 rounded-xl border-gray-200 text-sm resize-none" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Signature</label>
        <Textarea value={letter.signature.join("\n")} onChange={(e) => updateField("signature", e.target.value)} className="min-h-20 rounded-xl border-gray-200 text-sm resize-none" placeholder="Nom et fonction du signataire" />
      </div>
    </div>
  );
}

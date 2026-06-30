"use client";

// ============================================================
// EDITOR VIEW — extrait de documents.tsx
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Sparkles, Download, Share2, Eye, Bold, Italic,
  Heading1, List, Table, Quote, ArrowLeft, Loader2,
  X, Code, Edit3, Send, MessageSquare,
} from "lucide-react";
import { updateDocument, generatePreview } from "@/lib/document-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hook/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DocumentItem, DocumentType } from "@/types/document";
import { DocumentImageUpload, type UploadedImage } from "@/components/documents/document-image-upload";
import { DocumentShareDialog } from "@/components/documents/document-share-dialog";
import { pageVariants } from "./constants";
import {
  parseLetterContent, composeLetterContentFromParsed, sanitizeLetterBodyStrict,
  extractHeaderMetadata, toggleDocHeader,
} from "./letter-utils";
import { LetterFormEditor } from "./letter-form-editor";
import { DocumentPages } from "./document-pages";
import { exportToPDF } from "./pdf-export";
import { useCurrentUser } from "./use-current-user";

function TypeBadge({ type }: { type: DocumentType }) {
  const colors = {
    letter: "bg-amber-50 text-amber-700 border-amber-200",
    compterendu: "bg-emerald-50 text-emerald-700 border-emerald-200",
    report: "bg-violet-50 text-violet-700 border-violet-200",
  };
  const labels = { letter: "Lettre", compterendu: "Compte rendu", report: "Rapport" };
  return <Badge variant="outline" className={`text-xs font-medium ${colors[type]}`}>{labels[type]}</Badge>;
}

export function EditorView({ document: doc, onBack, backUrl }: { document: DocumentItem; onBack: () => void; backUrl?: string | null }) {
  const currentUser = useCurrentUser();
  const { user: authUser } = useAuth();
  const [currentDoc, setCurrentDoc] = useState<DocumentItem>(doc);
  const [showSource, setShowSource] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [isAiWorking, setIsAiWorking] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; poste: string }>>([]);
  const [documentShares, setDocumentShares] = useState<any[]>([]);
  const router = useRouter();
  
  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else {
      onBack();
    }
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Vérifier les permissions d'accès
  const canEdit = currentDoc.employerId === authUser?.employerId || currentDoc.accessPermission === 'write';
  const isReadOnly = !canEdit;

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

  // Charger les employés pour le partage
  useEffect(() => {
    if (showShareDialog) {
      fetch('/api/employees')
        .then(res => res.json())
        .then(data => setEmployees(data.employees || []))
        .catch(err => console.error('Erreur chargement employés:', err));
    }
  }, [showShareDialog]);

  // Charger les partages existants
  useEffect(() => {
    if (showShareDialog && currentDoc.id) {
      fetch(`/api/documents/${currentDoc.id}/shares`)
        .then(res => res.json())
        .then(data => setDocumentShares(data.shares || []))
        .catch(err => console.error('Erreur chargement partages:', err));
    }
  }, [showShareDialog, currentDoc.id]);

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

  const handleImageUpload = useCallback(async (uploadedImage: UploadedImage) => {
    const imageMarkdown = `\n![${uploadedImage.name}](${uploadedImage.url})\n`;
    handleContentChange(currentDoc.content + imageMarkdown);
    toast({ title: "Image ajoutée", description: uploadedImage.name });
  }, [currentDoc.content, handleContentChange, toast]);

  // Handlers pour le partage
  const handleVisibilityChange = useCallback(async (visibility: string) => {
    try {
      await fetch(`/api/documents/${currentDoc.id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      setCurrentDoc({ ...currentDoc, visibility: visibility as any });
    } catch (error) {
      console.error('Erreur mise à jour visibilité:', error);
      toast({ title: 'Erreur', description: 'Échec de la mise à jour de la visibilité', variant: 'destructive' });
    }
  }, [currentDoc, toast]);

  const handleShareAdd = useCallback(async (employeeId: string, permission: string, expiresAt?: string) => {
    try {
      const response = await fetch(`/api/documents/${currentDoc.id}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharedWithId: employeeId, permission, expiresAt }),
      });
      if (!response.ok) throw new Error('Erreur ajout partage');
      const data = await response.json();
      setDocumentShares([...documentShares, data.share]);
      if (currentDoc.visibility !== 'partage') {
        handleVisibilityChange('partage');
      }
    } catch (error) {
      console.error('Erreur ajout partage:', error);
      toast({ title: 'Erreur', description: 'Échec de l\'ajout du partage', variant: 'destructive' });
    }
  }, [currentDoc.id, currentDoc.visibility, documentShares, handleVisibilityChange, toast]);

  const handleShareRemove = useCallback(async (shareId: string) => {
    try {
      await fetch(`/api/documents/${currentDoc.id}/shares/${shareId}`, {
        method: 'DELETE',
      });
      setDocumentShares(documentShares.filter(s => s.id !== shareId));
      if (documentShares.length === 1) {
        handleVisibilityChange('prive');
      }
    } catch (error) {
      console.error('Erreur suppression partage:', error);
      toast({ title: 'Erreur', description: 'Échec de la suppression du partage', variant: 'destructive' });
    }
  }, [currentDoc.id, documentShares, handleVisibilityChange, toast]);

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
              <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-lg shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
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
              <Button variant="outline" size="sm" onClick={() => setShowAiPanel(!showAiPanel)} disabled={isReadOnly} className="rounded-lg">
                <Sparkles className="w-4 h-4 mr-1.5 text-violet-500" /><span className="hidden sm:inline">Modifier avec IA</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowSource(!showSource)} disabled={isReadOnly} className={`rounded-lg ${showSource ? "bg-violet-50 border-violet-200" : ""}`}>
                {showSource ? <><Eye className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">Aperçu</span></> : <><Code className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">Source</span></>}
              </Button>
              <div className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <span className="text-xs text-gray-500">En-tête</span>
                <Switch checked={headerEnabled} onCheckedChange={() => handleContentChange(toggleDocHeader(currentDoc.content, currentDoc.type))} disabled={isReadOnly} />
              </div>
              <Button variant="outline" size="sm" onClick={() => exportToPDF(currentDoc, currentUser)} className="rounded-lg">
                <Download className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">PDF</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)} disabled={currentDoc.employerId !== authUser?.employerId} className="rounded-lg">
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
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => insertMarkdown("**", "**")} disabled={isReadOnly} title="Gras"><Bold className="w-4 h-4 text-gray-600" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => insertMarkdown("_", "_")} disabled={isReadOnly} title="Italique"><Italic className="w-4 h-4 text-gray-600" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => insertMarkdown("\n## ", "\n")} disabled={isReadOnly} title="Titre"><Heading1 className="w-4 h-4 text-gray-600" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => insertMarkdown("\n- ", "\n")} disabled={isReadOnly} title="Liste"><List className="w-4 h-4 text-gray-600" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => insertMarkdown("\n| Col 1 | Col 2 |\n|---|---|\n| ", " | |\n")} disabled={isReadOnly} title="Tableau"><Table className="w-4 h-4 text-gray-600" /></Button>
        <DocumentImageUpload onImageUploaded={handleImageUpload} disabled={isAiWorking || isReadOnly} />
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => insertMarkdown("\n> ", "\n")} disabled={isReadOnly} title="Citation"><Quote className="w-4 h-4 text-gray-600" /></Button>
        <label className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white cursor-pointer">
          <input type="color" aria-label="Couleur du texte" title="Couleur" className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0" disabled={isReadOnly}
            onChange={(e) => insertMarkdown(`[[color:${e.target.value}]]`, "[[/color]]")} />
        </label>
        <Separator orientation="vertical" className="h-6 mx-1" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto py-6"
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f?.type.startsWith("image/")) {
            // Pour le drag-and-drop, on utilise aussi UploadThing
            // Pour l'instant, on garde le FileReader comme fallback
            const r = new FileReader();
            r.onload = () => {
              const base64 = r.result as string;
              const imageMarkdown = `\n![${f.name}](${base64})\n`;
              handleContentChange(currentDoc.content + imageMarkdown);
              toast({ title: "Image ajoutée", description: f.name });
            };
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
              <LetterFormEditor content={currentDoc.content} onChange={handleContentChange} textareaRef={textareaRef} disabled={isReadOnly} />
            ) : (
              <textarea ref={textareaRef} value={currentDoc.content} onChange={(e) => handleContentChange(e.target.value)} disabled={isReadOnly}
                className="w-full min-h-[70vh] p-4 font-mono text-sm text-gray-800 bg-white border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 leading-relaxed disabled:bg-gray-50 disabled:text-gray-500" spellCheck={false} />
            )}
          </div>
        ) : (
          <DocumentPages 
            content={currentDoc.content} 
            type={currentDoc.type} 
            title={currentDoc.title} 
            authorName={currentDoc.employer ? `${currentDoc.employer.firstName} ${currentDoc.employer.lastName}` : undefined}
            authorPosition={currentDoc.employer?.poste}
          />
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
                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
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
                  className="bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl px-4">
                  {isAiWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Dialog */}
      <DocumentShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        documentId={currentDoc.id}
        currentVisibility={currentDoc.visibility || 'prive'}
        currentShares={documentShares}
        onVisibilityChange={handleVisibilityChange}
        onShareAdd={handleShareAdd}
        onShareRemove={handleShareRemove}
        employees={employees}
        currentUserId={authUser?.employerId || ''}
      />
    </motion.div>
  );
}

"use client";

// ============================================================
// CREATE VIEW — 6-step wizard — extrait de documents.tsx
// ============================================================

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, Sparkles, Check, FileText, ClipboardList,
  ArrowLeft, Loader2, X, PlusCircle, Minus, File, ThumbsUp,
  Mail,
} from "lucide-react";
import { fetchDocuments, createDocument, generatePreview } from "@/lib/document-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { DocumentItem, DocumentType, DOCUMENT_TYPES, getDocumentTypeConfig } from "@/types/document";
import { pageVariants, stepVariants } from "./constants";
import { getLetterGuide, createDefaultLetterFields, parseDocumentDateInput } from "./letter-utils";
import { CreateStep, KeyPoint, LetterFields } from "./types";

function TypeIcon({ type, className }: { type: DocumentType; className?: string }) {
  switch (type) {
    case "letter": return <Mail className={className} />;
    case "compterendu": return <ClipboardList className={className} />;
    case "report": return <FileText className={className} />;
  }
}

export function CreateView({ onCancel, onCreated }: { onCancel: () => void; onCreated: (doc: DocumentItem) => void }) {
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
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s <= step ? "bg-linear-to-r from-violet-500 to-purple-500" : "bg-gray-200"}`} />
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
                      <Textarea placeholder={selectedType === "compterendu" ? "Brève description du contexte..." : "Décrivez le contexte, les objectifs, les données à inclure..."} value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-17.5 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base resize-none" />
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
                                <Textarea placeholder="Description (optionnel)" value={kp.description} onChange={(e) => updateKeyPoint(kp.id, "description", e.target.value)} className="min-h-12.5 rounded-lg border-gray-200 bg-white text-sm resize-none" />
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
                        <Textarea placeholder="Adresse complète de l'expéditeur" value={letterFields.senderAddress} onChange={(e) => updateLetterField("senderAddress", e.target.value)} className="min-h-22.5 rounded-xl border-gray-200 bg-white text-base resize-none" />
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
                        <Textarea placeholder="Adresse complète du destinataire" value={letterFields.recipientAddress} onChange={(e) => updateLetterField("recipientAddress", e.target.value)} className="min-h-22.5 rounded-xl border-gray-200 bg-white text-base resize-none" />
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
                      <Textarea placeholder="Ajoutez les précisions utiles pour la génération (référence, urgence, ton attendu, pièces jointes, etc.)" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-27.5 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Corps de la lettre</label>
                      <Textarea placeholder={selectedLetterGuide?.bodyPlaceholder ?? "Décrivez le contenu de la lettre..."} value={letterFields.body} onChange={(e) => updateLetterField("body", e.target.value)} className="min-h-45 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom pour la signature</label>
                      <Textarea placeholder="Nom et fonction de la personne signataire" value={letterFields.signatureName} onChange={(e) => updateLetterField("signatureName", e.target.value)} className="min-h-25 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base resize-none" />
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
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-100 to-purple-100 flex items-center justify-center"><File className="w-5 h-5 text-violet-600" /></div>
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
                <Textarea value={planEdited} onChange={(e) => setPlanEdited(e.target.value)} className="min-h-75 rounded-lg border-gray-200 bg-white text-sm leading-relaxed resize-none font-mono" placeholder="Le plan apparaîtra ici..." />
              </div>
            </motion.div>
          )}

          {/* STEP 5: Validation */}
          {step === 5 && (
            <motion.div key="step5" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4">
                <ThumbsUp className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Valider le plan ?</h2>
              <p className="text-sm text-gray-500 text-center max-w-sm mb-6">
                L&apos;IA va générer le document en suivant exactement ce plan. Vous pourrez le modifier ensuite.
              </p>
              <div className="w-full max-w-md p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600 max-h-50 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans">{planEdited}</pre>
              </div>
            </motion.div>
          )}

          {/* STEP 6: Generating */}
          {step === 6 && (
            <motion.div key="step6" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center py-16">
              {isGenerating ? (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-6">
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
              className={step === 3 ? "bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 rounded-xl px-6" : "rounded-xl px-6"}>
              {isGeneratingPlan ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Traitement...</> : <>Continuer <ChevronRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        )}
        {step === 5 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button variant="outline" onClick={() => setStep(4)} className="rounded-xl"><ChevronLeft className="w-4 h-4 mr-1" />Modifier le plan</Button>
            <Button onClick={handleValidateAndGenerate} className="bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 rounded-xl px-6">
              <Sparkles className="w-4 h-4 mr-2" />Générer le document
            </Button>
          </div>
        )}
      </main>
    </motion.div>
  );
}

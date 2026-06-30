"use client";

// ============================================================
// EVENT COMPTE RENDU VIEW — extrait de documents.tsx
// Raccourci rapide depuis la page Événements
// ============================================================

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Loader2, PlusCircle, Minus, ArrowLeft,
  ClipboardList, Calendar, Users, MapPin, Video, Monitor,
  Building2, Globe, UserCheck, UserX, ClipboardCheck,
} from "lucide-react";
import { createDocument, updateDocument, generatePreview } from "@/lib/document-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DocumentItem, DocumentType } from "@/types/document";
import { pageVariants } from "./constants";
import { EventData, KeyPoint, ParticipantStatus } from "./types";
import { useCurrentUser } from "./use-current-user";

export function EventCompteRenduView({
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

  const existingDoc = eventData.existingDocument;
  const isEditing = !!existingDoc;

  // Pré-remplir avec les données existantes si on modifie
  const [title, setTitle] = useState(existingDoc?.title || eventData.title);
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

  // Charger les présences existantes si on modifie
  useEffect(() => {
    if (isEditing && eventData.id) {
      fetch(`/api/meetings/${eventData.id}/attendance`)
        .then(res => res.json())
        .then(data => {
          if (data.attendances) {
            const statuses: Record<string, ParticipantStatus> = {};
            data.attendances.forEach((att: any) => {
              statuses[att.participantId] = att.status;
            });
            setParticipantStatuses(prev => ({ ...prev, ...statuses }));
          }
        })
        .catch(err => console.error('Erreur chargement présences:', err));
    }
  }, [isEditing, eventData.id]);
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
      return `| ${p.employee.firstName || "ok"} ${p.employee.lastName} | ${p.employee.poste}  | ${statusLabel} |`;
    });
    return [
      '| Nom | Poste | Présence |',
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
  // ← participantTable retiré ici
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

      let createdDoc: DocumentItem | null;
      if (isEditing && existingDoc) {
        // Mettre à jour le document existant
        createdDoc = await updateDocument(existingDoc.id, {
          title: docData.title,
          content: docData.content,
          preview: docData.preview,
        });
        if (!createdDoc) throw new Error('Erreur lors de la mise à jour');
        toast({
          title: 'Compte rendu mis à jour',
          description: `"${createdDoc.title}" a été mis à jour avec succès.`,
        });
      } else {
        // Créer un nouveau document
        createdDoc = await createDocument(docData);
        if (!createdDoc) throw new Error('Erreur lors de la sauvegarde');
        toast({
          title: 'Compte rendu généré',
          description: `"${createdDoc.title}" a été créé avec succès.`,
        });
      }
      onCreated(createdDoc!);
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
              <h1 className="text-lg font-semibold text-gray-900">Compte rendu d&apos;événement</h1>
              <p className="text-xs text-gray-500">Raccourci rapide — IA génère un document 3 pages</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Bannière événement */}
        <div className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 p-5 shadow-sm">
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
              className="min-h-20 rounded-xl border-gray-200 bg-gray-50 text-sm resize-none"
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
                      className="min-h-12.5 rounded-lg border-gray-200 bg-white text-sm resize-none"
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
              <p className="text-sm">Ajoutez les points discutés lors de l&apos;événement (optionnel)</p>
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
                        <p className="text-xs text-gray-500 truncate">{p.employee.poste}</p>
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
            className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg rounded-xl px-6"
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

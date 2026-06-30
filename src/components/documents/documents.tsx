"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";

// Types
import { AppView, EventData } from "./_parts/types";
import { DocumentItem } from "@/types/document";

// Views
import { DashboardView } from "./_parts/dashboard-view";
import { CreateView } from "./_parts/create-view";
import { EditorView } from "./_parts/editor-view";
import { EventCompteRenduView } from "./_parts/event-compte-rendu-view";

// Re-export components used externally
export { DocumentPages } from "./_parts/document-pages";

// ============================================================
// MAIN
// ============================================================

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function DocumentAssistant() {
  const [view, setView] = useState<AppView>("dashboard");
  const [currentDoc, setCurrentDoc] = useState<DocumentItem | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const mounted = useIsMounted();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Détecter si un document est demandé via URL (modification)
  // ou si un événement est en attente depuis la page Événements
  useEffect(() => {
    if (!mounted) return;
    
    // Récupérer l'URL de retour depuis les paramètres
    const backParam = searchParams.get('back');
    if (backParam) {
      setBackUrl(backParam);
    }
    
    // Priorité 1: docId dans l'URL (modification directe)
    const docId = searchParams.get('docId');
    if (docId) {
      console.log('Chargement document depuis URL:', docId);
      fetch(`/api/documents/${docId}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(doc => {
          if (!doc || !doc.id) throw new Error('Document invalide');
          setCurrentDoc(doc);
          setView('editor');
        })
        .catch(err => {
          console.error('Erreur chargement document:', err);
          alert('Impossible de charger le document. Réessayez.');
          setView('dashboard');
        });
      return;
    }
    
    // Priorité 2: sessionStorage (création depuis événements)
    try {
      const raw = sessionStorage.getItem('evenement_compte_rendu');
      if (raw) {
        const data: EventData & { existingReportId?: string; backUrl?: string } = JSON.parse(raw);
        sessionStorage.removeItem('evenement_compte_rendu');
        
        // Récupérer l'URL de retour depuis sessionStorage
        if (data.backUrl) {
          setBackUrl(data.backUrl);
        }
        
        if (data.existingReportId) {
          fetch(`/api/documents/${data.existingReportId}`)
            .then(res => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            })
            .then(doc => {
              // S'assurer que le document a bien un contenu
              if (!doc || !doc.id) throw new Error('Document invalide');
              setCurrentDoc(doc);
              setView('editor');
            })
            .catch(err => {
              console.error('Erreur chargement document:', err);
              // Ne PAS créer un nouveau document — afficher une erreur
              alert('Impossible de charger le compte rendu existant. Réessayez.');
              // Rester sur le dashboard
              setView('dashboard');
            });
          return; // important
        } else {
          setEventData(data);
          setView('event-compterendu');
        }
      }
    } catch {
      sessionStorage.removeItem('evenement_compte_rendu');
    }
  }, [mounted, searchParams]);

  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-sm text-gray-500">Chargement...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AnimatePresence mode="wait">
        {view === "dashboard" && (
          <DashboardView key="dashboard"
            onNewDocument={() => setView("create")}
            onOpenDocument={(d) => { setCurrentDoc(d); setView("editor"); }} />
        )}
        {view === "create" && (
          <CreateView key="create"
            onCancel={() => setView("dashboard")}
            onCreated={(d) => { setCurrentDoc(d); setView("editor"); }} />
        )}
        {view === "editor" && currentDoc && (
          <EditorView key={`editor-${currentDoc.id}`}
            document={currentDoc}
            backUrl={backUrl}
            onBack={() => { setCurrentDoc(null); setView("dashboard"); }} />
        )}
        {view === "event-compterendu" && eventData && (
          <EventCompteRenduView
            key="event-compterendu"
            eventData={eventData}
            onCancel={() => { setEventData(null); setView("dashboard"); }}
            onCreated={(d) => { setCurrentDoc(d); setView("editor"); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

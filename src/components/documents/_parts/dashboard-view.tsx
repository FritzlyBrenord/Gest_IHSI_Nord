"use client";

// ============================================================
// DASHBOARD VIEW — extrait de documents.tsx
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, FileText, Mail, ClipboardList, ChevronRight,
  Sparkles, Trash2, Copy, Download, Share2, Printer, Eye,
  MoreVertical, Loader2, Globe, Users,
} from "lucide-react";
import { fetchDocuments, removeDocument, duplicateDocument } from "@/lib/document-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getVariantLabel, DocumentItem, DocumentType, getDocumentTypeConfig } from "@/types/document";
import { useAuth } from "@/hook/useAuth";
import { pageVariants, cardVariants } from "./constants";
import { cleanDocumentPreview } from "./letter-utils";
import { exportToPDF } from "./pdf-export";
import { useCurrentUser } from "./use-current-user";

function TypeIcon({ type, className }: { type: DocumentType; className?: string }) {
  switch (type) {
    case "letter": return <Mail className={className} />;
    case "compterendu": return <ClipboardList className={className} />;
    case "report": return <FileText className={className} />;
  }
}

function TypeBadge({ type }: { type: DocumentType }) {
  const config = getDocumentTypeConfig(type);
  const colors = {
    letter: "bg-amber-50 text-amber-700 border-amber-200",
    compterendu: "bg-emerald-50 text-emerald-700 border-emerald-200",
    report: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return <Badge variant="outline" className={`text-xs font-medium ${colors[type]}`}>{config?.label ?? type}</Badge>;
}

export function DashboardView({ onNewDocument, onOpenDocument }: {
  onNewDocument: () => void;
  onOpenDocument: (doc: DocumentItem) => void;
}) {
  const user = useCurrentUser();
  const { user: authUser } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de charger les documents", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocuments = useMemo(() => {
    if (!search.trim()) return documents;
    const q = search.toLowerCase();
    return documents.filter(d =>
      d.title.toLowerCase().includes(q) ||
      getVariantLabel(d.type, d.variant).toLowerCase().includes(q) ||
      d.preview.toLowerCase().includes(q)
    );
  }, [documents, search]);

  const handleDelete = async () => {
    if (!documentToDelete) return;
    try {
      await removeDocument(documentToDelete);
      await loadDocuments();
      toast({ title: "Document supprimé" });
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de supprimer le document", variant: "destructive" });
    } finally {
      setDocumentToDelete(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const n = await duplicateDocument(id);
      if (n) { 
        await loadDocuments(); 
        toast({ title: "Document dupliqué" }); 
      }
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de dupliquer le document", variant: "destructive" });
    }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Assistant de Documents IA</h1>
                <p className="text-sm text-gray-500 hidden sm:block">Créez vos documents professionnels en quelques secondes.</p>
              </div>
            </div>
            <Button onClick={onNewDocument} className="bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 rounded-xl px-6" size="lg">
              <Plus className="w-4 h-4 mr-2" />Nouveau document
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="relative mb-6 sm:mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Rechercher un document..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-11 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-base" />
        </div>

        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Mes documents</h2>
          {!isLoading && documents.length > 0 && <span className="text-sm text-gray-500">{documents.length} document{documents.length > 1 ? "s" : ""}</span>}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24">
            <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-4" />
            <p className="text-sm text-gray-500">Chargement de vos documents...</p>
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <AnimatePresence mode="popLayout">
              {filteredDocuments.map(doc => (
                <motion.div key={doc.id} variants={cardVariants} initial="initial" animate="animate" whileHover="hover" layout>
                  <Card className="group cursor-pointer border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => onOpenDocument(doc)}>
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <TypeIcon type={doc.type} className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm font-semibold text-gray-900 truncate">{doc.title.length > 30 ? doc.title.substring(0, 30) + '...' : doc.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <TypeBadge type={doc.type} />
                              {doc.visibility === 'public' && (
                                <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  <Globe className="w-3 h-3 mr-1" />Public
                                </Badge>
                              )}
                              {doc.visibility === 'partage' && doc.employerId !== authUser?.employerId && (
                                <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  <Users className="w-3 h-3 mr-1" />Partagé
                                </Badge>
                              )}
                              {doc.accessPermission === 'read' && doc.employerId !== authUser?.employerId && (
                                <Badge variant="secondary" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                                  Lecture seule
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onOpenDocument(doc)}><Eye className="w-4 h-4 mr-2" />Ouvrir</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToPDF(doc, user)}><Download className="w-4 h-4 mr-2" />Télécharger PDF</DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              if (navigator.share) { try { await navigator.share({ title: doc.title, text: cleanDocumentPreview(doc.preview || doc.content) }); } catch {} }
                              else { await navigator.clipboard.writeText(doc.content); }
                            }}><Share2 className="w-4 h-4 mr-2" />Partager</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToPDF(doc, user)}><Printer className="w-4 h-4 mr-2" />Imprimer</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(doc.id)}><Copy className="w-4 h-4 mr-2" />Dupliquer</DropdownMenuItem>
                            {doc.employerId === authUser?.employerId && (
                              <DropdownMenuItem onClick={() => setDocumentToDelete(doc.id)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Supprimer</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0" onClick={() => onOpenDocument(doc)}>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{cleanDocumentPreview(doc.preview || doc.content)}</p>
                      <span className="text-xs text-gray-400">Modifié le {format(new Date(doc.updatedAt), "d MMM yyyy", { locale: fr })}</span>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 sm:py-24">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-6"><FileText className="w-10 h-10 text-gray-300" /></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun document créé</h3>
            <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">Commencez par générer votre premier document professionnel.</p>
            <Button onClick={onNewDocument} className="bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 rounded-xl px-6">
              <Plus className="w-4 h-4 mr-2" />Créer un document
            </Button>
          </motion.div>
        )}
      </main>

      <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Cela supprimera définitivement le document et retirera l&apos;accès à toutes les personnes avec qui il a été partagé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

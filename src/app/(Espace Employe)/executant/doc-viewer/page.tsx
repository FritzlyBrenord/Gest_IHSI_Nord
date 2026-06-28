'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2, AlertCircle, Lock, Globe, Download, Share2, Mail, MessageCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentItem } from '@/types/document';
import { DocumentPages } from '@/components/documents/documents';
import { usePdfExport } from '@/hooks/usePdfExport';

const statusColors: Record<string, string> = {
  en_attente: 'bg-amber-100 text-amber-700 border-amber-200',
  a_corriger: 'bg-rose-100 text-rose-700 border-rose-200',
  valide: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};
const statusLabels: Record<string, string> = {
  en_attente: 'En attente de validation',
  a_corriger: 'À corriger',
  valide: 'Validé',
};

function ShareMenu({ onShare }: { onShare: (m: 'whatsapp' | 'email' | 'native') => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(v => !v)} className="gap-1.5">
        <Share2 className="w-4 h-4" /> Partager
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1 min-w-45">
            <button
              onClick={() => { setOpen(false); onShare('whatsapp'); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-green-50 text-green-700"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            <button
              onClick={() => { setOpen(false); onShare('email'); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-blue-50 text-blue-700"
            >
              <Mail className="w-4 h-4" /> Email
            </button>
            <button
              onClick={() => { setOpen(false); onShare('native'); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <MoreHorizontal className="w-4 h-4" /> Autres options
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DocViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const docId = searchParams.get('docId');
  const backUrl = searchParams.get('back') || '/evenements';

  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filename = doc?.title?.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || 'document';
  const { contentRef, isGenerating, downloadPdf, sharePdf } = usePdfExport({ filename, title: doc?.title });

  useEffect(() => {
    if (!docId) { setError('Identifiant du document manquant'); setLoading(false); return; }
    fetch(`/api/documents/${docId}`)
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Erreur serveur: ${res.status}`);
        }
        return res.json();
      })
      .then(data => { setDoc(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [docId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.push(backUrl)} className="rounded-lg shrink-0" title="Retour">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <h1 className="text-sm font-semibold text-gray-900 truncate">{doc?.title || 'Lecture du document'}</h1>
              </div>
              {doc?.workflowStatus && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColors[doc.workflowStatus] || ''}`}>
                    {statusLabels[doc.workflowStatus] || doc.workflowStatus}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions header */}
          <div className="flex items-center gap-2 shrink-0">
            {doc && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadPdf}
                  disabled={isGenerating}
                  className="gap-1.5"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isGenerating ? 'Génération…' : 'Télécharger PDF'}</span>
                </Button>
                <ShareMenu onShare={sharePdf} />
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => router.push(backUrl)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {loading && <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /><p className="text-sm">Chargement...</p></div>}
        {error && !loading && <div className="flex flex-col items-center justify-center py-24 gap-3"><AlertCircle className="w-10 h-10 text-rose-400" /><p className="text-base font-semibold text-rose-700">{error}</p><Button variant="outline" onClick={() => router.push(backUrl)}><ArrowLeft className="w-4 h-4 mr-1.5" /> Retour</Button></div>}
        {doc && !loading && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border shadow-sm p-5 flex flex-wrap gap-4 items-start">
              <div className="flex-1 min-w-0 space-y-1">
                <h2 className="text-xl font-bold text-gray-900">{doc.title}</h2>
                {doc.employer && <p className="text-sm text-gray-500">Rédigé par <span className="font-medium text-gray-700">{doc.employer.firstName} {doc.employer.lastName}</span>{doc.employer.poste ? ` - ${doc.employer.poste}` : ''}</p>}
                <p className="text-xs text-gray-400">Créé le {new Date(doc.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {doc.workflowStatus && <Badge className={`border text-xs ${statusColors[doc.workflowStatus] || ''}`}>{statusLabels[doc.workflowStatus] || doc.workflowStatus}</Badge>}
                <Badge variant="outline" className="text-xs flex items-center gap-1">{doc.visibility === 'public' ? <><Globe className="w-3 h-3" /> Public</> : <><Lock className="w-3 h-3" /> Privé</>}</Badge>
              </div>
            </div>

            {doc.reviewComment && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-800">Note de correction de l'administrateur</p>
                  <p className="text-sm text-rose-700 mt-1">{doc.reviewComment}</p>
                </div>
              </div>
            )}

            {/* Zone capturée pour le PDF */}
            <div ref={contentRef} className="overflow-x-auto w-full flex justify-center py-4 bg-gray-50">
              <DocumentPages
                content={doc.content}
                type={doc.type as any}
                title={doc.title}
                showPageNumbers={true}
                authorName={doc.employer ? `${doc.employer.firstName} ${doc.employer.lastName}` : undefined}
                authorPosition={doc.employer?.poste}
              />
            </div>

            {/* Boutons de bas de page */}
            <div className="flex flex-wrap gap-3 justify-center pb-4">
              <Button onClick={downloadPdf} disabled={isGenerating} size="lg" className="gap-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-6">
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {isGenerating ? 'Génération du PDF…' : 'Télécharger le PDF'}
              </Button>
              <ShareMenu onShare={sharePdf} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function EmployeeDocViewerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="flex flex-col items-center gap-3 text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /><p className="text-sm">Chargement...</p></div></div>}>
      <DocViewerContent />
    </Suspense>
  );
}

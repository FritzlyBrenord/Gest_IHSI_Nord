'use client';

import { useEffect, useState, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, ArrowLeft, Clock, MapPin, Video, Users, FileText, Download, UserCheck, Eye, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface MeetingDetails {
  id: string;
  category: string;
  title: string;
  description: string | null;
  trainer: string | null;
  reportResponsible: { id: string; firstName: string; lastName: string; position: string; department: string } | null;
  startAt: string;
  durationMins: number;
  type: string;
  location: string | null;
  platform: string | null;
  meetingUrl: string | null;
  status: string;
  trainingDocuments: Array<{ id: string; name: string; url: string; size: number }>;
  participants: Array<{
    id: string;
    wasPresent: boolean;
    employee: { id: string; firstName: string; lastName: string; position: string; department: string };
  }>;
  reports: Array<{
    id: string;
    title: string;
    workflowStatus: string;
    visibility: string;
    createdAt: string;
    updatedAt: string;
    reviewComment: string | null;
    employer: { firstName: string; lastName: string };
  }>;
}

const statusLabels: Record<string, string> = {
  A_VENIR: 'À venir',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
};

const statusColors: Record<string, string> = {
  A_VENIR: 'bg-amber-100 text-amber-700',
  EN_COURS: 'bg-emerald-100 text-emerald-700',
  TERMINEE: 'bg-gray-100 text-gray-600',
  ANNULEE: 'bg-rose-100 text-rose-700',
};

const typeLabels: Record<string, string> = {
  PRESENTIEL: 'Présentiel',
  EN_LIGNE: 'En ligne',
  HYBRIDE: 'Hybride',
};

const categoryLabels: Record<string, string> = {
  REUNION: 'Réunion',
  FORMATION: 'Formation',
};

export default function MeetingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('infos');
  const [selectedReportForReview, setSelectedReportForReview] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isUpdatingReport, setIsUpdatingReport] = useState(false);

  useEffect(() => {
    async function fetchMeeting() {
      try {
        const res = await fetch(`/api/meetings/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        setMeeting(data.meeting);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }
    fetchMeeting();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">Événement introuvable</h2>
        <Link href="/meetings">
          <Button className="mt-4">Retour aux événements</Button>
        </Link>
      </div>
    );
  }

  const isFormation = meeting.category === 'FORMATION';
  const startObj = new Date(meeting.startAt);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/meetings">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {meeting.title}
        </h1>
      </div>

      {/* Review Modal */}
      {selectedReportForReview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">Demander une correction</h3>
            <textarea
              className="w-full border rounded-md p-3 min-h-[100px] mb-4 text-sm"
              placeholder="Saisissez votre commentaire..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedReportForReview(null)} disabled={isUpdatingReport}>Annuler</Button>
              <Button onClick={() => handleReportAction(selectedReportForReview, 'a_corriger')} disabled={isUpdatingReport || !reviewComment.trim()}>
                Envoyer
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge className={statusColors[meeting.status] || 'bg-gray-100'}>{statusLabels[meeting.status]}</Badge>
        <Badge variant="outline">{categoryLabels[meeting.category]}</Badge>
        <Badge variant="outline">{typeLabels[meeting.type]}</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="infos">Informations</TabsTrigger>
          <TabsTrigger value="participants">Participants ({meeting.participants.length})</TabsTrigger>
          {isFormation && <TabsTrigger value="documents">Documents ({meeting.trainingDocuments.length})</TabsTrigger>}
          <TabsTrigger value="reports">Rapports ({meeting.reports?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="infos" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Détails de l'événement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {meeting.description && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Description</h3>
                  <p className="text-sm bg-muted p-3 rounded-md">{meeting.description}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">Date et Heure</h3>
                  <p className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    {startObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    {startObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ({meeting.durationMins} minutes)
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">Lieu / Plateforme</h3>
                  {meeting.location && (
                    <p className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      {meeting.location}
                    </p>
                  )}
                  {meeting.platform && (
                    <p className="flex items-center gap-2 text-sm">
                      <Video className="w-4 h-4 text-emerald-600" />
                      {meeting.platform}
                    </p>
                  )}
                  {meeting.meetingUrl && (
                    <p className="flex items-center gap-2 text-sm mt-1">
                      <a href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                        {meeting.meetingUrl}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {isFormation && meeting.trainer && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Formateur</h3>
                  <p className="text-sm">{meeting.trainer}</p>
                </div>
              )}

              {meeting.reportResponsible && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <h3 className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Responsable du rapport
                  </h3>
                  <p className="text-sm text-blue-900">
                    {meeting.reportResponsible.firstName} {meeting.reportResponsible.lastName} - {meeting.reportResponsible.position}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Liste des invités</CardTitle>
              {meeting.status === 'TERMINEE' && (
                <Badge variant="secondary">
                  {meeting.participants.filter(p => p.wasPresent).length} présent(s)
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {meeting.participants.map((p) => (
                  <div key={p.id} className="flex items-center p-3 border rounded-md gap-3 bg-white justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold shrink-0">
                        {p.employee.firstName.charAt(0)}{p.employee.lastName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.employee.firstName} {p.employee.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.employee.position}</p>
                      </div>
                    </div>
                    {meeting.status === 'TERMINEE' && (
                      <div className="shrink-0">
                        {p.wasPresent ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                            Présent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-rose-700 border-rose-200 bg-rose-50">
                            Absent
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isFormation && (
          <TabsContent value="documents" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Documents de formation</CardTitle>
              </CardHeader>
              <CardContent>
                {meeting.trainingDocuments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun document attaché.</p>
                ) : (
                  <div className="grid gap-3">
                    {meeting.trainingDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50">
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="text-sm font-medium truncate" title={doc.name}>{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{Math.round(doc.size / 1024)} Ko</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-2" /> Télécharger
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="reports" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rapports d'événement</CardTitle>
            </CardHeader>
            <CardContent>
              {(!meeting.reports || meeting.reports.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun rapport n'a été généré.</p>
              ) : (
                <div className="grid gap-4">
                  {meeting.reports.map(report => (
                    <div key={report.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-md bg-white gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-900">{report.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant={report.workflowStatus === 'valide' ? 'default' : report.workflowStatus === 'a_corriger' ? 'destructive' : 'secondary'}>
                            {report.workflowStatus === 'valide' ? 'Validé' : report.workflowStatus === 'a_corriger' ? 'À corriger' : 'En attente'}
                          </Badge>
                          <Badge variant={report.visibility === 'public' ? 'outline' : 'secondary'}>
                            {report.visibility === 'public' ? 'Public' : 'Privé'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Par {report.employer.firstName} {report.employer.lastName}</span>
                          <span className="text-xs text-muted-foreground">le {new Date(report.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {report.reviewComment && (
                          <div className="mt-2 text-sm p-2 bg-rose-50 text-rose-800 border border-rose-100 rounded-md">
                            <strong>Note de correction :</strong> {report.reviewComment}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" asChild className="text-blue-600 border-blue-200 hover:bg-blue-50">
                          <Link href={`/backoffice-doc-viewer?docId=${report.id}&back=/meetings/${id}`}>
                            <Eye className="w-4 h-4 mr-1.5" />
                            Lire le document
                          </Link>
                        </Button>
                        {report.workflowStatus !== 'valide' && (
                          <Button variant="outline" size="sm" onClick={() => handleReportAction(report.id, 'valide')} disabled={isUpdatingReport} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                            Valider
                          </Button>
                        )}
                        {report.workflowStatus === 'en_attente' && (
                          <Button variant="outline" size="sm" onClick={() => setSelectedReportForReview(report.id)} disabled={isUpdatingReport} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                            Demander correction
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleReportVisibility(report.id, report.visibility === 'public' ? 'prive' : 'public')} disabled={isUpdatingReport}>
                          {report.visibility === 'public' ? 'Rendre privé' : 'Rendre public'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  async function handleReportAction(reportId: string, status: string) {
    setIsUpdatingReport(true);
    try {
      const res = await fetch(`/api/documents/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowStatus: status, reviewComment: status === 'a_corriger' ? reviewComment : null }),
      });
      if (!res.ok) throw new Error('Erreur lors de la mise à jour');
      toast.success(status === 'valide' ? 'Rapport validé' : 'Demande de correction envoyée');
      setSelectedReportForReview(null);
      setReviewComment('');
      // Rafraîchir l'événement
      const evRes = await fetch(`/api/meetings/${id}`);
      if (evRes.ok) {
        const evData = await evRes.json();
        setMeeting(evData.meeting);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur');
    } finally {
      setIsUpdatingReport(false);
    }
  }

  async function handleReportVisibility(reportId: string, visibility: string) {
    setIsUpdatingReport(true);
    try {
      const res = await fetch(`/api/documents/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) throw new Error('Erreur lors de la mise à jour');
      toast.success(`Le rapport est maintenant ${visibility}`);
      // Rafraîchir l'événement
      const evRes = await fetch(`/api/meetings/${id}`);
      if (evRes.ok) {
        const evData = await evRes.json();
        setMeeting(evData.meeting);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur');
    } finally {
      setIsUpdatingReport(false);
    }
  }
}

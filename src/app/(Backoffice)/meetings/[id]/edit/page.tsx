'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ArrowLeft, Users, Check, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrainingDocumentsUpload, type UploadedTrainingDocument } from '@/components/meetings/training-documents-upload';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
}

interface Meeting {
  id: string;
  category: string;
  title: string;
  description: string | null;
  trainer: string | null;
  reportResponsibleId?: string | null;
  startAt: string;
  durationMins: number;
  type: string;
  location: string | null;
  platform: string | null;
  meetingUrl: string | null;
  trainingDocuments?: Array<{
    id: string;
    key: string;
    url: string;
    name: string;
    mimeType: string;
    size: number;
  }>;
  participants: Array<{ employee: { id: string } }>;
}

interface TrainingDocumentInput {
  id: string;
  key: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  isNew?: boolean;
}

function normalizeFormByType(type: string, current: {
  category: string; title: string; description: string; trainer: string;
  reportResponsibleId: string; startAt: string; durationMins: number;
  type: string; location: string; platform: string; meetingUrl: string;
}) {
  if (type === 'PRESENTIEL') return { ...current, type, platform: '', meetingUrl: '' };
  if (type === 'EN_LIGNE') return { ...current, type, location: '' };
  return { ...current, type };
}

function getCurrentDateTimeLocal() {
  const now = new Date();
  now.setSeconds(0, 0);
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export default function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchEmp, setSearchEmp] = useState('');
  const [trainingDocuments, setTrainingDocuments] = useState<TrainingDocumentInput[]>([]);
  const [pendingDocumentFiles, setPendingDocumentFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    category: 'REUNION',
    title: '',
    description: '',
    trainer: '',
    reportResponsibleId: '',
    startAt: '',
    durationMins: 30,
    type: 'PRESENTIEL',
    location: '',
    platform: '',
    meetingUrl: '',
  });
  const minStartAt = getCurrentDateTimeLocal();

  useEffect(() => {
    params.then((p) => setMeetingId(p.id));
  }, [params]);

  useEffect(() => {
    if (!meetingId) return;

    async function fetchData() {
      try {
        const [employeesRes, meetingRes] = await Promise.all([
          fetch('/api/employees?limit=1000&status=active'),
          fetch(`/api/meetings/${meetingId}`),
        ]);

        if (!employeesRes.ok || !meetingRes.ok) {
          throw new Error('Erreur de chargement');
        }

        const employeesData = await employeesRes.json();
        const meetingData = await meetingRes.json();
        const meeting: Meeting = meetingData.meeting;

        setEmployees(employeesData.employees || []);
        setSelectedIds(meeting.participants.map((p) => p.employee.id));
        setForm({
          category: meeting.category || 'REUNION',
          title: meeting.title,
          description: meeting.description || '',
          trainer: meeting.trainer || '',
          reportResponsibleId: meeting.reportResponsibleId || '',
          startAt: new Date(meeting.startAt).toISOString().slice(0, 16),
          durationMins: meeting.durationMins,
          type: meeting.type,
          location: meeting.location || '',
          platform: meeting.platform || '',
          meetingUrl: meeting.meetingUrl || '',
        });
        setTrainingDocuments((meeting.trainingDocuments || []).map((doc) => ({ ...doc, isNew: false })));
      } catch {
        toast.error("Erreur lors du chargement de l'événement");
        router.push('/meetings');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [meetingId, router]);

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(employees.map((emp) => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchEmp.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchEmp.toLowerCase())
  );

  const removeTrainingDocument = (id: string) => {
    setTrainingDocuments((current) => current.filter((doc) => doc.id !== id));
  };

  const uploadPendingDocuments = async () => {
    if (pendingDocumentFiles.length === 0) return [];
    const formData = new FormData();
    for (const file of pendingDocumentFiles) {
      formData.append('files', file);
    }
    const response = await fetch('/api/training-documents/upload', { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erreur de téléversement');
    return (data.documents || []) as UploadedTrainingDocument[];
  };

  const handleSubmit = async () => {
    if (!form.title) {
      toast.error('Veuillez remplir le titre');
      return;
    }
    if (!form.startAt || new Date(form.startAt).getTime() < new Date(minStartAt).getTime()) {
      toast.error("La date et l'heure doivent être maintenant ou dans le futur");
      return;
    }
    if (form.category === 'FORMATION' && !form.trainer.trim()) {
      toast.error('Veuillez renseigner le formateur');
      return;
    }
    if (form.category === 'FORMATION' && trainingDocuments.length === 0 && pendingDocumentFiles.length === 0) {
      toast.error('Veuillez ajouter au moins un document de formation');
      return;
    }
    if (!selectAll && selectedIds.length === 0) {
      toast.error('Veuillez sélectionner au moins un participant');
      return;
    }

    setSubmitting(true);
    try {
      const uploadedDocuments = form.category === 'FORMATION' ? await uploadPendingDocuments() : [];
      const allDocuments = form.category === 'FORMATION'
        ? [
            ...trainingDocuments.filter((doc) => !doc.isNew),
            ...uploadedDocuments.map((doc) => ({ ...doc, isNew: true })),
          ]
        : [];

      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          trainer: form.category === 'FORMATION' ? form.trainer : '',
          reportResponsibleId: form.reportResponsibleId || null,
          participantIds: selectAll ? employees.map((e) => e.id) : selectedIds,
          retainDocumentIds: form.category === 'FORMATION'
            ? allDocuments.filter((d) => !d.isNew).map((d) => d.id)
            : [],
          trainingDocuments: form.category === 'FORMATION'
            ? allDocuments.filter((d) => d.isNew)
            : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      toast.success('Événement mis à jour');
      setPendingDocumentFiles([]);
      router.push(`/meetings/${meetingId}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Chargement...</div>;
  }

  const isFormation = form.category === 'FORMATION';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/meetings/${meetingId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-emerald-600" />
          Modifier l&apos;événement
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulaire principal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Détails de l&apos;événement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Nature *</Label>
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REUNION">Réunion</SelectItem>
                    <SelectItem value="FORMATION">Formation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date et heure *</Label>
                <Input type="datetime-local" min={minStartAt} value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Durée (min) *</Label>
                <Input type="number" min={5} value={form.durationMins} onChange={(e) => setForm({ ...form, durationMins: parseInt(e.target.value, 10) || 30 })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mode *</Label>
              <Select value={form.type} onValueChange={(value) => setForm((current) => normalizeFormByType(value, current))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENTIEL">Présentiel</SelectItem>
                  <SelectItem value="EN_LIGNE">En ligne</SelectItem>
                  <SelectItem value="HYBRIDE">Hybride</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(form.type === 'PRESENTIEL' || form.type === 'HYBRIDE') && (
              <div className="space-y-2">
                <Label>Lieu</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Salle, adresse..." />
              </div>
            )}

            {(form.type === 'EN_LIGNE' || form.type === 'HYBRIDE') && (
              <>
                <div className="space-y-2">
                  <Label>Plateforme</Label>
                  <Select value={form.platform} onValueChange={(value) => setForm({ ...form, platform: value })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Microsoft Teams">Microsoft Teams</SelectItem>
                      <SelectItem value="Zoom">Zoom</SelectItem>
                      <SelectItem value="Google Meet">Google Meet</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lien de la réunion</Label>
                  <Input value={form.meetingUrl} onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} placeholder="https://..." />
                </div>
              </>
            )}

            {isFormation && (
              <div className="space-y-2">
                <Label>Formateur *</Label>
                <Input value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} placeholder="Nom du formateur" />
              </div>
            )}

            <div className="space-y-2">
              <Label>Responsable du rapport du jour</Label>
              <Select value={form.reportResponsibleId || 'none'} onValueChange={(value) => setForm({ ...form, reportResponsibleId: value === 'none' ? '' : value })}>
                <SelectTrigger><SelectValue placeholder="Choisir un employé" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun pour le moment</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isFormation && (
              <div className="space-y-3 rounded-lg border border-dashed p-4">
                <div>
                  <p className="text-sm font-medium">Documents de formation</p>
                  <p className="text-xs text-muted-foreground">Gérer les documents attachés à cette formation.</p>
                </div>
                <TrainingDocumentsUpload
                  pendingFiles={pendingDocumentFiles}
                  onPendingFilesChange={setPendingDocumentFiles}
                  disabled={submitting}
                />
                {trainingDocuments.length > 0 && (
                  <div className="space-y-2">
                    {trainingDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{Math.round(doc.size / 1024)} Ko</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTrainingDocument(doc.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Tous les employés actifs</Label>
              <Switch checked={selectAll} onCheckedChange={handleSelectAll} />
            </div>

            {!selectAll && (
              <>
                <Input
                  placeholder="Rechercher un employé..."
                  value={searchEmp}
                  onChange={(e) => setSearchEmp(e.target.value)}
                />
                {filteredEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun employé trouvé.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {filteredEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${selectedIds.includes(emp.id) ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-muted'}`}
                        onClick={() => toggleEmployee(emp.id)}
                      >
                        <div className={`flex items-center justify-center w-5 h-5 shrink-0 rounded border ${selectedIds.includes(emp.id) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>
                          {selectedIds.includes(emp.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{emp.position} · {emp.department}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{selectedIds.length} employé(s) sélectionné(s)</p>
              </>
            )}

            {selectAll && (
              <div className="text-center py-4">
                <Badge className="bg-emerald-100 text-emerald-700">
                  <Users className="w-3 h-3 mr-1" /> Tous les employés actifs ({employees.length})
                </Badge>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} disabled={submitting}>
                <Save className="w-4 h-4 mr-1" />
                {submitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

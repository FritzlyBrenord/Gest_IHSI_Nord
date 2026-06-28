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
import { Calendar, ArrowLeft, Users, Check, GraduationCap, ArrowRight, ArrowLeftCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrainingDocumentsUpload, type UploadedTrainingDocument } from '@/components/meetings/training-documents-upload';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  poste: string;
  department: string;
}

type EventChoice = 'REUNION' | 'FORMATION' | '';

interface TrainingDocumentInput {
  id: string;
  key: string;
  url: string;
  appUrl: string;
  ufsUrl: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

const steps = [
  { id: 1, label: 'Type' },
  { id: 2, label: 'Détails' },
  { id: 3, label: 'Participants' },
];

function getCurrentDateTimeLocal() {
  const now = new Date();
  now.setSeconds(0, 0);
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function normalizeFormByType(type: string, current: {
  category: string;
  title: string;
  description: string;
  trainer: string;
  reportResponsibleId: string;
  startAt: string;
  durationMins: number;
  type: string;
  location: string;
  platform: string;
  meetingUrl: string;
}) {
  if (type === 'PRESENTIEL') {
    return { ...current, type, platform: '', meetingUrl: '' };
  }
  if (type === 'EN_LIGNE') {
    return { ...current, type, location: '' };
  }
  return { ...current, type };
}

export default function NewMeetingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchEmp, setSearchEmp] = useState('');
  const [trainingDocuments, setTrainingDocuments] = useState<TrainingDocumentInput[]>([]);
  const [pendingDocumentFiles, setPendingDocumentFiles] = useState<File[]>([]);
  const [step, setStep] = useState(1);
  const [eventChoice, setEventChoice] = useState<EventChoice>('');
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
    async function fetchEmployees() {
      try {
        const res = await fetch('/api/employees?limit=1000&status=active');
        const data = await res.json();
        setEmployees(data.employees || []);
      } catch {
        toast.error('Erreur chargement employés');
      }
    }
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((emp) =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchEmp.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchEmp.toLowerCase())
  );

  const isFormation = eventChoice === 'FORMATION';
  const entityLabel = isFormation ? 'formation' : 'événement';

  const applyEventChoice = (choice: EventChoice) => {
    setEventChoice(choice);
    if (choice === 'REUNION' || choice === 'FORMATION') {
      setForm((current) => ({
        ...current,
        category: choice,
        trainer: choice === 'FORMATION' ? current.trainer : '',
      }));
      if (choice !== 'FORMATION') {
        setTrainingDocuments([]);
        setPendingDocumentFiles([]);
      }
    }
  };

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

  const toggleEmployee = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(employees.map((emp) => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  const validateDetailsStep = () => {
    if (!eventChoice) {
      toast.error("Veuillez choisir un type d'événement");
      return false;
    }
    if (!form.title || !form.startAt || !form.durationMins) {
      toast.error('Veuillez remplir les champs obligatoires');
      return false;
    }
    if (new Date(form.startAt).getTime() < new Date(minStartAt).getTime()) {
      toast.error("La date et l'heure doivent être maintenant ou dans le futur");
      return false;
    }
    if (isFormation && !form.trainer.trim()) {
      toast.error('Veuillez renseigner le formateur');
      return false;
    }
    if (isFormation && trainingDocuments.length === 0 && pendingDocumentFiles.length === 0) {
      toast.error('Veuillez ajouter au moins un document de formation');
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 1 && !eventChoice) {
      toast.error("Veuillez choisir un type d'événement");
      return;
    }
    if (step === 2 && !validateDetailsStep()) return;
    setStep((current) => Math.min(current + 1, 3));
  };

  const goPrevious = () => {
    setStep((current) => Math.max(current - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateDetailsStep()) {
      setStep(2);
      return;
    }
    if (!selectAll && selectedIds.length === 0) {
      toast.error('Veuillez sélectionner au moins un participant');
      return;
    }

    setSubmitting(true);
    try {
      const uploadedDocuments = isFormation ? await uploadPendingDocuments() : [];
      const allDocuments = isFormation
        ? [...trainingDocuments, ...uploadedDocuments.map((doc) => ({ ...doc }))]
        : [];

      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          category: eventChoice,
          trainer: isFormation ? form.trainer : '',
          reportResponsibleId: form.reportResponsibleId || null,
          participantIds: selectAll ? [] : selectedIds,
          selectAll,
          trainingDocuments: allDocuments,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      const data = await res.json();
      if (data.emailDelivery?.attempted) {
        if (data.emailDelivery.failed > 0) {
          const firstError = data.emailDelivery.errors?.[0];
          toast.warning(
            firstError
              ? `Événement créé, mais l'envoi a échoué: ${firstError}`
              : `Événement créé, mais ${data.emailDelivery.failed} email(s) n'ont pas pu être envoyés`
          );
        } else {
          toast.success(`Événement créé et ${data.emailDelivery.sent} invitation(s) envoyée(s)`);
        }
      } else {
        toast.success('Événement créé avec succès');
      }

      setPendingDocumentFiles([]);
      router.push('/meetings');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/meetings">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-emerald-600" />
          Nouvel événement
        </h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {steps.map((item) => (
          <Badge key={item.id} variant={step === item.id ? 'default' : 'outline'} className={step === item.id ? 'bg-emerald-600' : ''}>
            Étape {item.id} · {item.label}
          </Badge>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {step === 1 && "Choisir le type d'événement"}
              {step === 2 && 'Renseigner les détails'}
              {step === 3 && 'Choisir les participants'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => applyEventChoice('REUNION')}
                  className={`rounded-xl border p-5 text-left transition-colors ${eventChoice === 'REUNION' ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-muted'}`}
                >
                  <Calendar className="mb-3 h-6 w-6 text-emerald-600" />
                  <p className="font-semibold">Réunion</p>
                  <p className="mt-1 text-sm text-muted-foreground">Créer une réunion avec les champs nécessaires.</p>
                </button>
                <button
                  type="button"
                  onClick={() => applyEventChoice('FORMATION')}
                  className={`rounded-xl border p-5 text-left transition-colors ${eventChoice === 'FORMATION' ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-muted'}`}
                >
                  <GraduationCap className="mb-3 h-6 w-6 text-emerald-600" />
                  <p className="font-semibold">Formation</p>
                  <p className="mt-1 text-sm text-muted-foreground">Créer une formation avec un formateur.</p>
                </button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Titre {isFormation ? 'de la formation' : 'de la réunion'} *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={isFormation ? 'Titre de la formation' : 'Titre de la réunion'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={`Description de ${entityLabel}`}
                    rows={3}
                  />
                </div>
                {isFormation && (
                  <div className="space-y-2">
                    <Label>Formateur *</Label>
                    <Input
                      value={form.trainer}
                      onChange={(e) => setForm({ ...form, trainer: e.target.value })}
                      placeholder="Nom du formateur"
                    />
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
                          {emp.firstName} {emp.lastName} - {emp.poste}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isFormation && (
                  <div className="space-y-3 rounded-lg border border-dashed p-4">
                    <div>
                      <p className="text-sm font-medium">Documents de formation</p>
                      <p className="text-xs text-muted-foreground">Ils seront stockés via UploadThing.</p>
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Date et heure *</Label>
                    <Input type="datetime-local" min={minStartAt} value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Durée (min) *</Label>
                    <Input type="number" min={5} value={form.durationMins} onChange={(e) => setForm({ ...form, durationMins: parseInt(e.target.value, 10) || 30 })} />
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
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Inviter tous les employés actifs</Label>
                  <Switch checked={selectAll} onCheckedChange={handleSelectAll} />
                </div>

                {!selectAll && (
                  <>
                    <Input
                      placeholder="Rechercher et choisir un employé..."
                      value={searchEmp}
                      onChange={(e) => setSearchEmp(e.target.value)}
                    />
                    {filteredEmployees.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Aucun employé trouvé.</p>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {filteredEmployees.map((emp) => (
                          <div
                            key={emp.id}
                            className={`flex items-center gap-3 rounded-lg border p-2 transition-colors cursor-pointer ${selectedIds.includes(emp.id) ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-muted'}`}
                            onClick={() => toggleEmployee(emp.id)}
                          >
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selectedIds.includes(emp.id) ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'}`}>
                              {selectedIds.includes(emp.id) && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                              <p className="truncate text-xs text-muted-foreground">{emp.poste} · {emp.department}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{selectedIds.length} employé(s) sélectionné(s)</p>
                  </>
                )}

                {selectAll && (
                  <div className="py-4 text-center">
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <Users className="mr-1 h-3 w-3" /> Tous les employés actifs ({employees.length})
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Résumé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type choisi</span>
                <Badge variant="outline">
                  {eventChoice === 'REUNION' ? 'Réunion' : eventChoice === 'FORMATION' ? 'Formation' : 'Aucun'}
                </Badge>
              </div>
              {eventChoice && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mode</span>
                    <span>{form.type === 'EN_LIGNE' ? 'En ligne' : form.type === 'HYBRIDE' ? 'Hybride' : 'Présentiel'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Participants</span>
                    <span>{selectAll ? `Tous (${employees.length})` : `${selectedIds.length} employé(s)`}</span>
                  </div>
                  {isFormation && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Documents</span>
                      <span>{trainingDocuments.length + pendingDocumentFiles.length}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t pt-4 space-y-2">
              <Button variant="outline" className="w-full" onClick={goPrevious} disabled={step === 1}>
                <ArrowLeftCircle className="mr-2 h-4 w-4" /> Précédent
              </Button>

              {step < 3 ? (
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={goNext}>
                  Suivant <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Création...' : "Créer l'événement"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Plus, Search } from 'lucide-react';
import { useSuperviseurDemo } from '@/components/superviseur/superviseur-provider';
import { EmptyState, PriorityBadge, StatusBadge, getInitials } from '@/components/superviseur/ui';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type FormState = {
  titre: string;
  description: string;
  priorite: 'haute' | 'normale' | 'basse';
  dateDebut: string;
  dateFin: string;
};

type DraftState = {
  notes: string;
};

type TaskHistoryEntry = {
  kind: 'employee' | 'supervisor';
  statusLabel: string;
  note: string;
  createdAt: string;
  status?: 'a_faire' | 'en_cours' | 'termine' | 'en_retard';
};

const TASK_HISTORY_PAGE_SIZE = 4;
const TASKS_PAGE_SIZE = 5;

function buildTaskHistoryEntries(task: {
  employeeStatusNotes?: Array<{ status: 'a_faire' | 'en_cours' | 'termine' | 'en_retard'; note: string | null; createdAt: string }>;
  notesSuperviseur?: string | null;
  validatedAt?: string | null;
  dateFin: string;
}): TaskHistoryEntry[] {
  const employeeEntries = (task.employeeStatusNotes || []).map((entry) => ({
    kind: 'employee' as const,
    statusLabel: entry.status === 'a_faire'
      ? 'A faire'
      : entry.status === 'en_cours'
        ? 'En cours'
        : entry.status === 'termine'
          ? 'Termine'
          : 'En retard',
    note: entry.note?.trim() || 'Aucune note',
    createdAt: entry.createdAt,
    status: entry.status,
  }));

  const supervisorEntries = task.notesSuperviseur
    ? [{
      kind: 'supervisor' as const,
        statusLabel: 'Superviseur',
        note: task.notesSuperviseur,
        createdAt: task.validatedAt || task.dateFin,
      }]
    : [];

  return [...employeeEntries, ...supervisorEntries];
}

const emptyForm: FormState = {
  titre: '',
  description: '',
  priorite: 'normale',
  dateDebut: '',
  dateFin: '',
};

export default function SuperviseurEquipeMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const {
    members,
    memberTasks,
    createMemberTask,
    updateMemberTaskNotes,
    updateMemberTaskStatus,
    validateMemberTaskResult,
  } = useSuperviseurDemo();
  const [memberId, setMemberId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [historyPages, setHistoryPages] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [tasksPage, setTasksPage] = useState(1);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    params.then((value) => setMemberId(value.id));
  }, [params]);

  const member = members.find((item) => item.id === memberId) || null;
  const tasks = useMemo(
    () => memberTasks.filter((task) => task.membreId === memberId).sort((left, right) => right.dateFin.localeCompare(left.dateFin)),
    [memberId, memberTasks]
  );

  const filteredTasks = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return tasks;

    return tasks.filter((task) =>
      [
        task.titre,
        task.description,
        task.statut,
        task.priorite,
        task.notesSuperviseur || '',
        task.rapportEmploye || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    );
  }, [search, tasks]);

  const tasksPageCount = Math.max(1, Math.ceil(filteredTasks.length / TASKS_PAGE_SIZE));
  const currentTasksPage = Math.min(tasksPage, tasksPageCount);
  const paginatedTasks = useMemo(() => {
    return filteredTasks.slice((currentTasksPage - 1) * TASKS_PAGE_SIZE, currentTasksPage * TASKS_PAGE_SIZE);
  }, [filteredTasks, currentTasksPage]);

  function toggleTask(taskId: string) {
    setExpandedTaskIds((current) => ({
      ...current,
      [taskId]: !current[taskId],
    }));
  }

  function getSupervisorNote(task: (typeof tasks)[number], draftNotes: string) {
    return task.notesSuperviseur?.trim() || draftNotes.trim() || '';
  }

  if (!member) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Membre introuvable.</p>
        <Button className="mt-4" onClick={() => router.push('/superviseur/equipe')}>
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/superviseur/equipe">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Avatar className="h-14 w-14 border border-slate-200">
            <AvatarFallback className="bg-emerald-50 text-emerald-700">
              {getInitials(`${member.prenom} ${member.nom}`)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              {member.prenom} {member.nom}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {member.poste} | {member.email}
            </p>
            <div className="mt-3">
              <StatusBadge status={member.statut} />
            </div>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Creer une tache
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Taches assignees</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{tasks.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cloturees</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {tasks.filter((task) => task.resultatValide).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Taches en cours</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {tasks.filter((task) => task.statut === 'en_cours').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une tache, un statut ou une note..."
            />
          </div>
        </CardContent>
      </Card>

      {filteredTasks.length === 0 ? (
        <EmptyState
          title="Aucune tache pour ce membre"
          description="Aucune tache ne correspond à votre recherche."
          icon={<ClipboardCheck className="h-6 w-6" />}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <p>
              {filteredTasks.length} tache(s) trouvée(s)
            </p>
            {tasksPageCount > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={currentTasksPage <= 1}
                  onClick={() => setTasksPage((current) => Math.max(1, current - 1))}
                >
                  Prev
                </Button>
                <span className="text-xs text-slate-500">
                  {currentTasksPage} / {tasksPageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={currentTasksPage >= tasksPageCount}
                  onClick={() => setTasksPage((current) => Math.min(tasksPageCount, current + 1))}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>

          {paginatedTasks.map((task) => {
            const isLocked = task.resultatValide;
            const isWaitingClosure = task.statut === 'termine' && !task.resultatValide;
            const draft = drafts[task.id] || {
              notes: task.notesSuperviseur,
            };
            const historyEntries = buildTaskHistoryEntries(task);
            const historyPage = historyPages[task.id] || 1;
            const historyPageCount = Math.max(1, Math.ceil(historyEntries.length / TASK_HISTORY_PAGE_SIZE));
            const historySlice = historyEntries.slice(
              (historyPage - 1) * TASK_HISTORY_PAGE_SIZE,
              historyPage * TASK_HISTORY_PAGE_SIZE
            );
            const isExpanded = expandedTaskIds[task.id] ?? false;

            return (
              <Card key={task.id} className="border-slate-200 bg-white shadow-sm">
                <CardContent className="space-y-5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{task.titre}</p>
                      <p className="mt-1 text-sm text-slate-500">{task.description}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={task.statut} />
                      <PriorityBadge priority={task.priorite} />
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => toggleTask(task.id)}>
                        {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                        {isExpanded ? 'Replier' : 'Déplier'}
                      </Button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                      <div className="space-y-4">
                        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Debut
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {new Date(task.dateDebut).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Fin
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {new Date(task.dateFin).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Resultat
                            </p>
                            <Badge
                              className={
                                task.resultatValide
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isWaitingClosure
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-700'
                              }
                            >
                              {task.resultatValide
                                ? 'Cloturee'
                                : isWaitingClosure
                                  ? 'En attente de cloture'
                                  : 'En attente'}
                            </Badge>
                            {task.validatedAt ? (
                              <p className="mt-2 text-xs text-slate-500">
                                Date de terminaison : {new Date(task.validatedAt).toLocaleDateString('fr-FR')}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {historyEntries.length ? (
                          <div className="space-y-2">
                            <Label>Notes de suivi</Label>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  Notes de suivi
                                </p>
                                {historyEntries.length > TASK_HISTORY_PAGE_SIZE ? (
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2"
                                      disabled={historyPage <= 1}
                                      onClick={() => setHistoryPages((current) => ({
                                        ...current,
                                        [task.id]: Math.max(1, historyPage - 1),
                                      }))}
                                    >
                                      Prev
                                    </Button>
                                    <span>{historyPage} / {historyPageCount}</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2"
                                      disabled={historyPage >= historyPageCount}
                                      onClick={() => setHistoryPages((current) => ({
                                        ...current,
                                        [task.id]: Math.min(historyPageCount, historyPage + 1),
                                      }))}
                                    >
                                      Next
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                              <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
                                {historySlice.map((entry, index) => (
                                  <div key={`${task.id}-history-${entry.kind}-${entry.createdAt}-${historyPage}-${index}`} className="rounded-xl border border-white bg-white p-3 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <Badge
                                        className={
                                          entry.kind === 'supervisor'
                                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : entry.status === 'termine'
                                              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                              : entry.status === 'en_cours'
                                                ? 'border border-blue-200 bg-blue-50 text-blue-700'
                                                : entry.status === 'en_retard'
                                                  ? 'border border-rose-200 bg-rose-50 text-rose-700'
                                                  : 'border border-slate-200 bg-slate-50 text-slate-700'
                                        }
                                      >
                                        {entry.statusLabel}
                                      </Badge>
                                      <span className="text-xs text-slate-400">
                                        {new Date(entry.createdAt).toLocaleString('fr-FR')}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">
                                      {entry.note}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="space-y-2">
                          <Label>Note pour l'employe</Label>
                          <Textarea
                            rows={4}
                            disabled={isLocked}
                            value={draft.notes}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [task.id]: {
                                  ...draft,
                                  notes: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Changer le statut</Label>
                          <Select
                            value={task.statut}
                            disabled={isLocked}
                            onValueChange={(value: 'a_faire' | 'en_cours' | 'termine' | 'en_retard') =>
                              updateMemberTaskStatus(task.id, value, draft.notes)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="a_faire">A faire</SelectItem>
                              <SelectItem value="en_cours">En cours</SelectItem>
                              <SelectItem value="termine">Termine</SelectItem>
                              <SelectItem value="en_retard">En retard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                          Modifiez le statut directement dans la liste, puis enregistrez uniquement la note si besoin.
                          Lorsque vous avez termine le suivi, vous pouvez cloturer cette tache definitivement.
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            disabled={isLocked}
                            onClick={async () => {
                              await updateMemberTaskNotes(task.id, draft.notes);
                            }}
                          >
                            Enregistrer la note
                          </Button>
                          {!isLocked && isWaitingClosure ? (
                            <Button
                              variant="outline"
                              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => {
                                validateMemberTaskResult(task.id, getSupervisorNote(task, draft.notes));
                              }}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Cloturer la tache
                            </Button>
                          ) : null}
                        </div>

                        {isLocked ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                            Cette tache est cloturee par vous. Le statut et les notes ne peuvent plus etre modifies.
                            {task.validatedAt ? (
                              <p className="mt-2">
                                Date de terminaison : {new Date(task.validatedAt).toLocaleDateString('fr-FR')}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <span>
                        {task.dateDebut ? new Date(task.dateDebut).toLocaleDateString('fr-FR') : '--'}
                      </span>
                      <span>•</span>
                      <span>
                        {task.resultatValide
                          ? 'Cloturee'
                          : isWaitingClosure
                            ? 'En attente de cloture'
                            : 'En attente'}
                      </span>
                      <span>•</span>
                      <span>{task.rapportEmploye}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {tasksPageCount > 1 ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm text-slate-600">
                Page {currentTasksPage} sur {tasksPageCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={currentTasksPage <= 1}
                  onClick={() => setTasksPage((current) => Math.max(1, current - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={currentTasksPage >= tasksPageCount}
                  onClick={() => setTasksPage((current) => Math.min(tasksPageCount, current + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Creer une tache pour {member.prenom}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={form.titre}
                onChange={(event) => setForm((current) => ({ ...current, titre: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Priorite</Label>
                <Select
                  value={form.priorite}
                  onValueChange={(value: 'haute' | 'normale' | 'basse') =>
                    setForm((current) => ({ ...current, priorite: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="basse">Basse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date debut</Label>
                <Input
                  type="date"
                  value={form.dateDebut}
                  onChange={(event) => setForm((current) => ({ ...current, dateDebut: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Date fin</Label>
                <Input
                  type="date"
                  value={form.dateFin}
                  onChange={(event) => setForm((current) => ({ ...current, dateFin: event.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                if (!form.titre.trim() || !form.dateDebut || !form.dateFin || form.dateFin < form.dateDebut) return;
                try {
                  await createMemberTask({
                    membreId: member.id,
                    titre: form.titre.trim(),
                    description: form.description.trim(),
                    priorite: form.priorite,
                    dateDebut: form.dateDebut,
                    dateFin: form.dateFin,
                  });
                  setForm(emptyForm);
                  setDialogOpen(false);
                } catch (error) {
                  console.error('[superviseur.equipe.member] createMemberTask failed', error);
                }
              }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

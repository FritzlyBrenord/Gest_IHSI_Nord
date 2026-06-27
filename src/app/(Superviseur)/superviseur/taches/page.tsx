'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, Search, Send, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchJsonOrThrow } from '@/lib/fetch-json';
import { useSuperviseurDemo } from '@/components/superviseur/superviseur-provider';
import { EmptyState } from '@/components/superviseur/ui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const objectiveStatusLabels: Record<string, string> = {
  NON_COMMENCE: 'Non commence',
  EN_COURS: 'En cours',
  ATTEINT: 'Atteint',
  BLOQUE: 'Bloque',
  SANS_REPONSE: 'Sans reponse',
  REPORTE: 'Reporte',
};

const statusOptions = ['NON_COMMENCE', 'EN_COURS', 'ATTEINT', 'BLOQUE', 'SANS_REPONSE', 'REPORTE'] as const;

type ObjectiveTask = {
  id: string;
  objectiveId: string;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  planLabel: string;
  title: string;
  status: string;
  progressNote: string;
  isEvaluated: boolean;
  targetGroupId: string | null;
  targetGroupName: string | null;
  targetDepartment: string | null;
  responsibleEmployeeId: string | null;
};

type ObjectiveReport = {
  id: string;
  meetingId: string;
  objectiveId: string;
  status: string;
  note: string | null;
  generatedContent: string;
  employeeId: string;
  targetGroupId?: string | null;
  targetGroupName?: string | null;
  updatedAt: string;
};

type ShareDraft = {
  assigneeId: string;
  title: string;
  description: string;
  priority: 'haute' | 'normale' | 'basse';
  dateDebut: string;
  dateFin: string;
};

type ShareModalState = {
  task: ObjectiveTask;
  draft: ShareDraft;
} | null;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function makeKey(task: ObjectiveTask) {
  return `${task.meetingId}:${task.id}`;
}

function normalizeText(value: string | null | undefined) {
  return String(value || '').trim();
}

export default function SuperviseurTachesPage() {
  const { objectiveTasks, objectiveReports, teams, createMemberTask, addObjectiveReport } = useSuperviseurDemo();
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { status: string; note: string }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [shareModal, setShareModal] = useState<ShareModalState>(null);

  const mergedReports = useMemo(() => objectiveReports, [objectiveReports]);

  const filteredTasks = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return objectiveTasks.filter((task) => {
      if (!normalized) return true;
      return [task.title, task.planLabel, task.meetingTitle, task.targetGroupName || '', task.targetDepartment || '']
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [objectiveTasks, search]);

  function getDraft(task: ObjectiveTask) {
    const key = makeKey(task);
    return drafts[key] || {
      status: task.status || 'NON_COMMENCE',
      note: task.progressNote || '',
    };
  }

  function getEligibleMembers(task: ObjectiveTask) {
    const department = normalizeText(task.targetDepartment).toLowerCase();
    const baseMembers = task.targetGroupId
      ? teams.find((team) => team.id === task.targetGroupId)?.members || []
      : department
        ? teams.flatMap((team) => team.members).filter((member) => normalizeText(member.department).toLowerCase() === department)
        : teams.flatMap((team) => team.members);

    const seen = new Set<string>();
    return baseMembers.filter((member) => {
      const memberId = member.id;
      const isSameResponsible = Boolean(task.responsibleEmployeeId && task.responsibleEmployeeId === memberId);
      const isActive = Boolean(member.isActive ?? true);
      if (!isActive || isSameResponsible || seen.has(memberId)) {
        return false;
      }
      seen.add(memberId);
      return true;
    });
  }

  function openShareModal(task: ObjectiveTask) {
    const eligibleMembers = getEligibleMembers(task);
    if (eligibleMembers.length === 0) {
      toast.error("Aucun membre disponible pour partager cette tache.");
      return;
    }

    setShareModal({
      task,
      draft: {
        assigneeId: eligibleMembers[0].id,
        title: `Sous-tache - ${task.title}`,
        description: `Partage depuis l'objectif "${task.title}"\n\nPlan: ${task.planLabel}\nSemaine: ${task.meetingTitle}`,
        priority: 'normale',
        dateDebut: task.meetingDate,
        dateFin: task.meetingDate,
      },
    });
  }

  async function shareTask() {
    if (!shareModal) return;

    const { task, draft } = shareModal;
    const eligibleMembers = getEligibleMembers(task);
    const selectedMember = eligibleMembers.find((member) => member.id === draft.assigneeId);

    if (!selectedMember) {
      toast.error('Veuillez choisir un membre de l equipe.');
      return;
    }

    if (!draft.dateDebut || !draft.dateFin || draft.dateFin < draft.dateDebut) {
      toast.error('Veuillez choisir des dates valides.');
      return;
    }

    try {
      await createMemberTask({
        membreId: selectedMember.id,
        titre: draft.title.trim() || `Sous-tache - ${task.title}`,
        description: draft.description.trim() || `Partage depuis l'objectif "${task.title}"`,
        priorite: draft.priority,
        dateDebut: draft.dateDebut,
        dateFin: draft.dateFin,
      });
      toast.success(`Tache partagee avec ${selectedMember.firstName} ${selectedMember.lastName}.`);
      setShareModal(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de partager la tache.');
    }
  }

  async function saveReport(task: ObjectiveTask) {
    if (task.isEvaluated) {
      toast.error('Objectif deja evalue. Modification bloquee.');
      return;
    }

    const key = makeKey(task);
    const draft = getDraft(task);
    if (!draft.status) {
      toast.error('Choisissez un statut avant d enregistrer.');
      return;
    }

    setSavingKey(key);
    try {
      // Récupérer l'objectif complet pour patcher le statut de la tâche dans plans
      const { objective } = await fetchJsonOrThrow<{ objective: any }>(`/api/objectives/${task.objectiveId}`);

      const updatedPlans = (objective.plans || []).map((plan: any) => {
        if (plan.id !== (task as any).planId) return plan;
        return {
          ...plan,
          tasks: plan.tasks.map((t: any) => {
            if (t.id !== (task as any).taskId) return t;
            return {
              ...t,
              status: draft.status,
              evaluationNote: draft.note || t.evaluationNote || null,
            };
          }),
        };
      });

      await fetchJsonOrThrow(`/api/objectives/${task.objectiveId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: updatedPlans }),
      });

      // Mise à jour locale pour l'UI
      addObjectiveReport({
        id: `${task.objectiveId}:${(task as any).taskId}`,
        meetingId: task.meetingId,
        objectiveId: task.objectiveId,
        status: draft.status,
        note: draft.note || null,
        generatedContent: '',
        employeeId: '',
        targetGroupId: task.targetGroupId,
        targetGroupName: task.targetGroupName,
        updatedAt: new Date().toISOString(),
      });

      toast.success('Rapport enregistre.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l enregistrement.');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Objectifs recus</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Liste simple des objectifs. Changez le statut, ajoutez une note, puis enregistrez le rapport.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-slate-200 bg-slate-50 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Objectifs</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{filteredTasks.length}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Rapports</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-900">{mergedReports.length}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un objectif, un plan ou un groupe..."
            />
          </div>
        </CardContent>
      </Card>

      {filteredTasks.length === 0 ? (
        <EmptyState
          title="Aucun objectif trouve"
          description="Les objectifs de groupe de votre equipe apparaitront ici."
          icon={<ClipboardList className="h-6 w-6" />}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredTasks.map((task) => {
            const key = makeKey(task);
            const draft = getDraft(task);
            const latestReport = mergedReports
              .filter((report) => report.meetingId === task.meetingId && report.objectiveId === task.objectiveId)
              .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0];
            const isLocked = task.isEvaluated;

            return (
              <Card key={task.id} className="border-slate-200 bg-white shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {task.meetingTitle} | {formatDate(task.meetingDate)}
                      </p>
                    </div>
                    <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                      {objectiveStatusLabels[draft.status] || draft.status}
                    </Badge>
                  </div>

                  {isLocked ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Objectif deja evalue, modification bloquee.
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {task.planLabel}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {task.targetGroupName || task.targetDepartment || 'Cible non precisee'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Statut</label>
                    <select
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-500"
                      value={draft.status}
                      disabled={isLocked}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [key]: {
                            ...draft,
                            status: event.target.value,
                          },
                        }))
                      }
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {objectiveStatusLabels[option] || option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Note de suivi
                    </label>
                    <textarea
                      className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
                      value={draft.note}
                      disabled={isLocked}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [key]: {
                            ...draft,
                            note: event.target.value,
                          },
                        }))
                      }
                      placeholder="Ajoutez une note courte sur l avancement, un blocage ou une recommandation."
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => void saveReport(task)}
                      disabled={savingKey === key || isLocked}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {isLocked ? 'Deja evalue' : savingKey === key ? 'Enregistrement...' : 'Enregistrer le rapport'}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl border-slate-200"
                      onClick={() => openShareModal(task)}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Partager
                    </Button>
                    <span className="text-xs text-slate-500">Le rapport sera visible dans la partie admin.</span>
                  </div>

                  {latestReport ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dernier rapport</p>
                      <p className="mt-2 font-medium text-slate-900">
                        {objectiveStatusLabels[latestReport.status] || latestReport.status}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(latestReport.updatedAt)}</p>
                      {latestReport.note ? <p className="mt-3 leading-6">{latestReport.note}</p> : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(shareModal)} onOpenChange={(open) => !open && setShareModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Partager la tache</DialogTitle>
            <DialogDescription>
              Choisissez un membre de l equipe pour lui assigner une sous-tache simple a partir de cet objectif.
            </DialogDescription>
          </DialogHeader>

          {shareModal ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">{shareModal.task.title}</p>
                <p className="mt-1">
                  {shareModal.task.meetingTitle} | {shareModal.task.planLabel}
                </p>
                <p className="mt-1">
                  {shareModal.task.targetGroupName || shareModal.task.targetDepartment || 'Equipe cible non precisee'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Membre de l equipe</Label>
                <Select
                  value={shareModal.draft.assigneeId}
                  onValueChange={(value) =>
                    setShareModal((current) =>
                      current
                        ? {
                            ...current,
                            draft: {
                              ...current.draft,
                              assigneeId: value,
                            },
                          }
                        : current
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un membre" />
                  </SelectTrigger>
                  <SelectContent>
                    {getEligibleMembers(shareModal.task).map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} - {member.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Titre de la sous-tache</Label>
                <Input
                  value={shareModal.draft.title}
                  onChange={(event) =>
                    setShareModal((current) =>
                      current
                        ? {
                            ...current,
                            draft: {
                              ...current.draft,
                              title: event.target.value,
                            },
                          }
                        : current
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={5}
                  value={shareModal.draft.description}
                  onChange={(event) =>
                    setShareModal((current) =>
                      current
                        ? {
                            ...current,
                            draft: {
                              ...current.draft,
                              description: event.target.value,
                            },
                          }
                        : current
                    )
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Priorite</Label>
                  <Select
                    value={shareModal.draft.priority}
                    onValueChange={(value: 'haute' | 'normale' | 'basse') =>
                      setShareModal((current) =>
                        current
                          ? {
                              ...current,
                              draft: {
                                ...current.draft,
                                priority: value,
                              },
                            }
                          : current
                      )
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
                    value={shareModal.draft.dateDebut}
                    onChange={(event) =>
                      setShareModal((current) =>
                        current
                          ? {
                              ...current,
                              draft: {
                                ...current.draft,
                                dateDebut: event.target.value,
                              },
                            }
                          : current
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date fin</Label>
                  <Input
                    type="date"
                    value={shareModal.draft.dateFin}
                    onChange={(event) =>
                      setShareModal((current) =>
                        current
                          ? {
                              ...current,
                              draft: {
                                ...current.draft,
                                dateFin: event.target.value,
                              },
                            }
                          : current
                      )
                    }
                  />
                </div>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  La sous-tache sera ajoutee a l espace equipe du membre selectionne.
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareModal(null)}>
              Annuler
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void shareTask()}>
              Partager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

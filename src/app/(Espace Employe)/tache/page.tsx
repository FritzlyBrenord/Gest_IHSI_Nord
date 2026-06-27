'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList,
  Loader2,
  Send,
  Search,
  ChevronDown,
  ChevronUp,
  Lock,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceType = 'admin' | 'superviseur';

type UnifiedTask = {
  id: string;
  title: string;
  description: string | null;
  source: SourceType;
  sourceLabel: string;
  status: string;
  priority?: 'haute' | 'normale' | 'basse';
  isLocked: boolean;
  lockedReason?: string;
  progressNote?: string | null;
  createdAt: string;
  updatedAt: string;
  periodLabel?: string;
  periodStartsAt?: string;
  periodEndsAt?: string;
  targetGroupName?: string | null;
  // For admin objectives
  meetingId?: string;
  objectiveId?: string;
  // For team tasks
  teamId?: string;
  teamName?: string;
  supervisorName?: string;
  isValidated?: boolean;
  validatedAt?: string | null;
  employeeStatusNotes?: Array<{ status: string; note: string | null; createdAt: string; isAdmin?: boolean }>;
  supervisorNotes?: Array<{ note: string | null; createdAt: string }>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const OBJECTIVE_STATUS_OPTIONS = [
  { value: 'NON_COMMENCE', label: 'Non commencé' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'ATTEINT', label: 'Atteint' },
  { value: 'BLOQUE', label: 'Bloqué' },
  { value: 'REPORTE', label: 'Reporté' },
  { value: 'SANS_REPONSE', label: 'Sans réponse' },
];

const TEAM_TASK_STATUS_OPTIONS = [
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminée' },
  { value: 'en_retard', label: 'En retard' },
];

const PRIORITY_LABELS: Record<string, string> = {
  haute: 'Haute',
  normale: 'Normale',
  basse: 'Basse',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusStyle(source: SourceType, status: string) {
  if (source === 'admin') {
    if (status === 'ATTEINT') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status === 'EN_COURS') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (status === 'BLOQUE') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (status === 'REPORTE') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }
  if (status === 'termine') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'en_cours') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (status === 'en_retard') return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function statusLabel(source: SourceType, status: string) {
  if (source === 'admin') {
    return OBJECTIVE_STATUS_OPTIONS.find(o => o.value === status)?.label || status;
  }
  return TEAM_TASK_STATUS_OPTIONS.find(o => o.value === status)?.label || status;
}

function priorityStyle(priority?: string) {
  if (priority === 'haute') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (priority === 'basse') return 'bg-sky-100 text-sky-700 border-sky-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeTachesPage() {
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { status: string; note: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [teamsRes, teamTasksRes, objectivesRes] = await Promise.all([
          fetch('/api/compte-employer/teams'),
          fetch('/api/compte-employer/team-tasks'),
          fetch('/api/compte-employer/objectives'),
        ]);

        const [teamsData, teamTasksData, objectivesData] = await Promise.all([
          teamsRes.json(),
          teamTasksRes.json(),
          objectivesRes.json(),
        ]);

        const unified: UnifiedTask[] = [];

        // ── Admin objectives ──
        for (const meeting of (objectivesData.objectives || [])) {
          for (const period of (meeting.objectivePlans || [])) {
            for (const objective of (period.objectives || [])) {
              if (!objective.title?.trim()) continue;
              const uid = `admin-${objective.id}`;
              
              // Fetch history for this objective
              let objectiveHistory: Array<{ status: string; note: string | null; createdAt: string }> = [];
              try {
                const historyRes = await fetch(`/api/compte-employer/objective-reports?meetingId=${meeting.id}&objectiveId=${objective.id}`);
                if (historyRes.ok) {
                  const historyData = await historyRes.json();
                  objectiveHistory = historyData.history || [];
                }
              } catch (e) {
                console.error('Failed to fetch objective history:', e);
              }

              unified.push({
                id: uid,
                title: objective.title,
                description: meeting.description,
                source: 'admin',
                sourceLabel: 'Administration',
                status: objective.status || 'NON_COMMENCE',
                isLocked: Boolean(objective.isEvaluated),
                lockedReason: objective.isEvaluated ? "Évalué par l'administration" : undefined,
                progressNote: objective.progressNote || '',
                createdAt: period.startsAt,
                updatedAt: period.endsAt,
                periodLabel: period.plan,
                periodStartsAt: period.startsAt,
                periodEndsAt: period.endsAt,
                targetGroupName: objective.targetGroupName || null,
                meetingId: meeting.id,
                objectiveId: objective.id,
                employeeStatusNotes: objectiveHistory,
              });
            }
          }
        }

        // ── Supervisor team tasks ──
        const teamsMap: Record<string, { name: string; supervisor: { firstName: string; lastName: string } }> = {};
        for (const team of (teamsData.teams || [])) {
          teamsMap[team.id] = { name: team.name, supervisor: team.supervisor };
        }

        for (const task of (teamTasksData.tasks || [])) {
          const team = teamsMap[task.teamId];
          const supervisorName = team?.supervisor
            ? `${team.supervisor.firstName} ${team.supervisor.lastName}`.trim()
            : 'Superviseur';

          const uid = `supervisor-${task.id}`;
          unified.push({
            id: uid,
            title: task.title,
            description: task.description,
            source: 'superviseur',
            sourceLabel: supervisorName,
            status: task.status,
            priority: task.priority,
            isLocked: Boolean(task.isValidated),
            lockedReason: task.isValidated ? 'Validée par le superviseur' : undefined,
            progressNote: task.employeeNote || '',
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            teamId: task.teamId,
            teamName: team?.name || 'Équipe',
            supervisorName,
            isValidated: task.isValidated,
            validatedAt: task.validatedAt,
            employeeStatusNotes: task.employeeStatusNotes || [],
            supervisorNotes: task.supervisorNotes || [],
          });
        }

        // Sort: unlocked first, then by date desc
        unified.sort((a, b) => {
          if (a.isLocked !== b.isLocked) return a.isLocked ? 1 : -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setTasks(unified);

        // Initialize drafts
        const initDrafts: Record<string, { status: string; note: string }> = {};
        for (const t of unified) {
          const latestNote = t.employeeStatusNotes?.at(-1);
          initDrafts[t.id] = {
            status: latestNote?.status || t.status,
            note: latestNote?.note || t.progressNote || '',
          };
        }
        setDrafts(initDrafts);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function saveReport(task: UnifiedTask) {
    const draft = drafts[task.id];
    if (!draft?.status) {
      toast.error('Veuillez choisir un statut');
      return;
    }

    setSavingId(task.id);
    try {
      if (task.source === 'admin') {
        const res = await fetch('/api/compte-employer/objective-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId: task.meetingId,
            objectiveId: task.objectiveId,
            status: draft.status,
            note: draft.note,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur lors de l'enregistrement");
        }
        setTasks(prev => prev.map(t =>
          t.id === task.id
            ? { ...t, status: draft.status, progressNote: draft.note }
            : t
        ));
        toast.success("Rapport envoyé à l'administration");
      } else {
        const realId = task.id.replace('supervisor-', '');
        const res = await fetch(`/api/compte-employer/team-tasks/${realId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: draft.status, note: draft.note }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erreur');
        }
        const data = await res.json();
        setTasks(prev => prev.map(t =>
          t.id === task.id
            ? {
                ...t,
                status: data.task.status,
                progressNote: data.task.employeeNote,
                employeeStatusNotes: data.task.employeeStatusNotes || t.employeeStatusNotes,
                supervisorNotes: data.task.supervisorNotes || t.supervisorNotes,
                isValidated: data.task.isValidated,
                validatedAt: data.task.validatedAt,
                updatedAt: data.task.updatedAt,
              }
            : t
        ));
        setDrafts(prev => ({ ...prev, [task.id]: { status: data.task.status, note: '' } }));
        toast.success("Rapport envoyé au superviseur");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement");
    } finally {
      setSavingId(null);
    }
  }

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(t =>
      [t.title, t.sourceLabel, t.teamName || '', t.periodLabel || '', t.description || '', t.targetGroupName || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [tasks, search]);

  const toggle = (id: string) =>
    setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t =>
    t.source === 'admin' ? t.status === 'ATTEINT' : t.status === 'termine'
  ).length;
  const pendingTasks = totalTasks - doneTasks;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#003087]" />
          <p className="text-sm text-slate-500">Chargement de vos tâches…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#003087]/10">
                <ClipboardList className="h-5 w-5 text-[#003087]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-950">Mes tâches</h1>
                <p className="text-sm text-slate-500">Toutes les tâches qui vous sont assignées</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-slate-200 bg-slate-50 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{totalTasks}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">En cours</p>
                <p className="mt-2 text-3xl font-bold text-amber-900">{pendingTasks}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Terminées</p>
                <p className="mt-2 text-3xl font-bold text-emerald-900">{doneTasks}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Search bar ── */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une tâche, un superviseur, un groupe…"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Task list ── */}
      {filteredTasks.length === 0 ? (
        <Card className="border-dashed border-slate-200">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <ClipboardList className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-base font-medium text-slate-900">Aucune tâche trouvée</p>
            <p className="text-sm text-slate-500">
              {search ? "Modifiez votre recherche." : "Vous n'avez aucune tâche assignée pour le moment."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredTasks.map(task => {
            const draft = drafts[task.id] || { status: task.status, note: task.progressNote || '' };
            const isExpanded = expandedIds.includes(task.id);
            const statusOptions = task.source === 'admin' ? OBJECTIVE_STATUS_OPTIONS : TEAM_TASK_STATUS_OPTIONS;
            const hasHistory = (task.employeeStatusNotes?.length || 0) > 0 || (task.supervisorNotes?.length || 0) > 0;

            return (
              <Card key={task.id} className="border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="p-5 space-y-4">
                  {/* Task header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        {/* Source badge */}
                        <Badge
                          variant="outline"
                          className={
                            task.source === 'admin'
                              ? 'border-violet-200 bg-violet-50 text-violet-700 gap-1'
                              : 'border-blue-200 bg-blue-50 text-blue-700 gap-1'
                          }
                        >
                          {task.source === 'admin' ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <Users className="h-3 w-3" />
                          )}
                          {task.source === 'admin' ? 'Administration' : task.supervisorName}
                        </Badge>
                        {/* Team badge */}
                        {task.teamName && (
                          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                            {task.teamName}
                          </Badge>
                        )}
                        {/* Priority badge */}
                        {task.priority && (
                          <Badge variant="outline" className={`border ${priorityStyle(task.priority)}`}>
                            {PRIORITY_LABELS[task.priority] || task.priority}
                          </Badge>
                        )}
                        {/* Status badge */}
                        <Badge variant="outline" className={`border ${statusStyle(task.source, draft.status)}`}>
                          {statusLabel(task.source, draft.status)}
                        </Badge>
                        {/* Lock badge */}
                        {task.isLocked && (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {task.lockedReason || 'Validée'}
                          </Badge>
                        )}
                      </div>

                      <p className="text-base font-semibold text-slate-950 leading-snug">{task.title}</p>

                      {task.periodLabel && (
                        <p className="text-sm text-slate-500">{task.periodLabel}</p>
                      )}
                      {task.targetGroupName && (
                        <p className="text-sm text-slate-500">Groupe : {task.targetGroupName}</p>
                      )}
                      {task.periodStartsAt && task.periodEndsAt && (
                        <p className="text-xs text-slate-400">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {formatDate(task.periodStartsAt)} → {formatDate(task.periodEndsAt)}
                        </p>
                      )}
                      {task.description && !task.periodLabel && (
                        <p className="text-sm text-slate-500 line-clamp-2">{task.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => toggle(task.id)}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                    >
                      {isExpanded ? (
                        <>
                          Replier <ChevronUp className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          Rapport <ChevronDown className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      {task.isLocked ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          <div className="flex items-center gap-2 font-medium">
                            <Lock className="h-4 w-4" />
                            {task.lockedReason || 'Cette tâche est verrouillée.'}
                          </div>
                          {task.validatedAt && (
                            <p className="mt-1 text-xs text-emerald-700">
                              Validée le {formatDate(task.validatedAt)}
                            </p>
                          )}
                          {task.progressNote && (
                            <p className="mt-3 rounded-lg bg-white/70 p-3 text-slate-700">
                              {task.progressNote}
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Statut
                              </label>
                              <select
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#003087] focus:ring-1 focus:ring-[#003087]/20"
                                value={draft.status}
                                onChange={e =>
                                  setDrafts(prev => ({
                                    ...prev,
                                    [task.id]: { ...draft, status: e.target.value },
                                  }))
                                }
                              >
                                {statusOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Note de suivi
                              </label>
                              <textarea
                                rows={3}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#003087] focus:ring-1 focus:ring-[#003087]/20 resize-none"
                                value={draft.note}
                                onChange={e =>
                                  setDrafts(prev => ({
                                    ...prev,
                                    [task.id]: { ...draft, note: e.target.value },
                                  }))
                                }
                                placeholder={
                                  task.source === 'admin'
                                    ? "Ajoutez une note pour l'administration…"
                                    : "Ajoutez une note pour votre superviseur…"
                                }
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <Button
                              className="rounded-xl bg-[#003087] hover:bg-[#00215d]"
                              onClick={() => void saveReport(task)}
                              disabled={savingId === task.id}
                            >
                              {savingId === task.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="mr-2 h-4 w-4" />
                              )}
                              {savingId === task.id ? 'Enregistrement…' : 'Soumettre le rapport'}
                            </Button>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Le rapport sera transmis à{' '}
                              {task.source === 'admin' ? "l'administration" : `${task.supervisorName}`}.
                            </span>
                          </div>
                        </>
                      )}

                      {/* History of notes */}
                      {hasHistory && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Historique
                          </p>
                          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                            {(task.employeeStatusNotes || []).map((entry, i) => (
                              <div
                                key={`emp-${i}`}
                                className={`flex items-start gap-3 rounded-xl border p-3 ${
                                  entry.isAdmin
                                    ? 'border-violet-100 bg-violet-50'
                                    : 'border-slate-100 bg-slate-50'
                                }`}
                              >
                                <Badge
                                  variant="outline"
                                  className={`shrink-0 border text-xs ${
                                    entry.isAdmin
                                      ? 'border-violet-200 bg-violet-50 text-violet-700'
                                      : statusStyle(task.source, entry.status)
                                  }`}
                                >
                                  {entry.isAdmin ? 'Administration' : statusLabel(task.source, entry.status)}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  {entry.note && (
                                    <p className={`text-sm whitespace-pre-line ${
                                      entry.isAdmin ? 'text-violet-800' : 'text-slate-700'
                                    }`}>{entry.note}</p>
                                  )}
                                  <p className={`mt-1 text-xs ${
                                    entry.isAdmin ? 'text-violet-600' : 'text-slate-400'
                                  }`}>{formatDateTime(entry.createdAt)}</p>
                                </div>
                              </div>
                            ))}
                            {(task.supervisorNotes || []).map((entry, i) => (
                              <div
                                key={`sup-${i}`}
                                className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3"
                              >
                                <Badge variant="outline" className="shrink-0 border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">
                                  Superviseur
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  {entry.note && (
                                    <p className="text-sm text-emerald-800 whitespace-pre-line">{entry.note}</p>
                                  )}
                                  <p className="mt-1 text-xs text-emerald-600">{formatDateTime(entry.createdAt)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

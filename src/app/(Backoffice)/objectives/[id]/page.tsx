'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, ClipboardList, CalendarDays, Clock, PenLine,
  CheckCircle2, Circle, Lock, Unlock, Trash2, ChevronDown,
  ChevronUp, MessageSquare, User, Users, X, Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskItem {
  id: string;
  title: string;
  status: string;
  department: string;
  responsibleType: 'personne' | 'equipe' | '';
  personId: string | null;
  teamId: string | null;
  respondedAt?: string | null;
  responseStatus?: string | null;
  responseNote?: string | null;
  // Noms résolus côté API ou client
  personName?: string;
  teamName?: string;
  score?: number;
  evaluationNote?: string | null;
  hasBeenEvaluated?: boolean;
  // Notes de l'administration
  adminNotes?: Array<{ note: string; createdAt: string }>;
  // Notes de l'employé
  employeeNotes?: Array<{ note: string; status: string; createdAt: string }>;
  progressNote?: string | null;
}

interface PlanItem {
  id: string;
  name: string;
  tasks: TaskItem[];
}

interface ObjectiveDetail {
  id: string;
  title: string;
  description: string | null;
  periodType: string;
  startDate: string;
  endDate: string;
  plans: PlanItem[];
  isEvaluated: boolean;
  evaluatedAt: string | null;
  globalScore: number | null;
  inheritedFrom: { id: string; title: string } | null;
  createdAt: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  a_faire:  'À faire',
  en_cours: 'En cours',
  termine:  'Terminé',
  bloque:   'Bloqué',
};

const STATUS_COLORS: Record<string, string> = {
  a_faire:  'bg-gray-100 text-gray-600',
  en_cours: 'bg-blue-100 text-blue-700',
  termine:  'bg-emerald-100 text-emerald-700',
  bloque:   'bg-red-100 text-red-600',
};

const PERIOD_LABELS: Record<string, string> = {
  hebdomadaire: 'Hebdomadaire',
  mensuel:      'Mensuel',
  trimestriel:  'Trimestriel',
  semestriel:   'Semestriel',
  annuel:       'Annuel',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function computePlanScore(tasks: TaskItem[]) {
  if (!tasks.length) return 0;
  return Math.round(tasks.reduce((acc, t) => acc + (t.score || 0), 0) / tasks.length);
}

function computeGlobalScore(plans: PlanItem[]) {
  if (!plans.length) return 0;
  return Math.round(plans.reduce((s, p) => s + computePlanScore(p.tasks), 0) / plans.length);
}

function ProgressRing({ value, size = 56 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 75 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        style={{ fontSize: size > 60 ? 16 : 12, fontWeight: 700, fill: color }}
        transform={`rotate(90 ${size / 2} ${size / 2})`}
      >
        {value}%
      </text>
    </svg>
  );
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

// ─── Modal Historique ────────────────────────────────────────────────────────────

function HistoryModal({ task, onClose }: { task: TaskItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-violet-600" />
            Historique de la tâche
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-800">{task.title}</p>

          {/* Employee notes from history */}
          {task.employeeNotes && task.employeeNotes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                Notes du responsable
              </p>
              {task.employeeNotes.map((note, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs border-none ${STATUS_COLORS[note.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[note.status] ?? note.status}
                    </Badge>
                  </div>
                  {note.note && (
                    <p className="text-sm text-amber-800 bg-white border rounded-lg px-3 py-2">{note.note}</p>
                  )}
                  <p className="text-xs text-amber-600">{formatDate(note.createdAt)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Fallback for old responseNote */}
          {task.responseNote && (!task.employeeNotes || task.employeeNotes.length === 0) && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <User className="h-4 w-4 text-amber-600" />
                Réponse du responsable
              </div>
              <p className="text-sm text-slate-700 bg-white border rounded-lg px-3 py-2">{task.responseNote}</p>
              {task.respondedAt && (
                <p className="text-xs text-slate-400">{formatDate(task.respondedAt)}</p>
              )}
            </div>
          )}

          {/* Admin notes */}
          {task.adminNotes && task.adminNotes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                Notes de l'administration
              </p>
              {task.adminNotes.map((note, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-violet-100 bg-violet-50 p-4 space-y-2"
                >
                  <p className="text-sm text-violet-800 bg-white border rounded-lg px-3 py-2">{note.note}</p>
                  <p className="text-xs text-violet-600">{formatDate(note.createdAt)}</p>
                </div>
              ))}
            </div>
          )}

          {(!task.responseNote && (!task.employeeNotes || task.employeeNotes.length === 0) && (!task.adminNotes || task.adminNotes.length === 0)) && (
            <p className="text-sm text-muted-foreground italic">Aucun historique disponible.</p>
          )}
        </div>

        <Button className="w-full" variant="outline" onClick={onClose}>Fermer</Button>
      </div>
    </div>
  );
}

// ─── Modal réponse ────────────────────────────────────────────────────────────

function ResponseModal({ task, onClose }: { task: TaskItem; onClose: () => void }) {
  const responsible = task.responsibleType === 'personne' ? task.personName : task.teamName;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-600" />
            Réponse du responsable
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-xl bg-gray-50 border p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            {task.responsibleType === 'personne'
              ? <User className="h-4 w-4 text-amber-600" />
              : <Users className="h-4 w-4 text-amber-600" />
            }
            {responsible ?? '—'}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Tâche concernée</p>
            <p className="text-sm font-medium">{task.title}</p>
          </div>
          {task.responseStatus && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Statut déclaré</p>
              <Badge className={`text-xs border-none ${STATUS_COLORS[task.responseStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABELS[task.responseStatus] ?? task.responseStatus}
              </Badge>
            </div>
          )}
          {task.responseNote ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Note / Commentaire</p>
              <p className="text-sm text-gray-700 bg-white border rounded-lg px-3 py-2">{task.responseNote}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Aucune note laissée.</p>
          )}
          {task.respondedAt && (
            <p className="text-xs text-muted-foreground">
              Répondu le {formatDate(task.respondedAt)}
            </p>
          )}
        </div>

        <Button className="w-full" variant="outline" onClick={onClose}>Fermer</Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ObjectiveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id     = params.id as string;

  const [objective,    setObjective]    = useState<ObjectiveDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [modalTask,    setModalTask]    = useState<TaskItem | null>(null);

  const [isEvaluating,  setIsEvaluating] = useState(false);
  const [evalModal,     setEvalModal]    = useState<{ task: TaskItem; planId: string } | null>(null);
  const [evalScore,     setEvalScore]    = useState<number | string>('');
  const [evalNote,      setEvalNote]     = useState('');
  const [noteModal,     setNoteModal]    = useState<{ task: TaskItem; planId: string } | null>(null);
  const [adminNote,     setAdminNote]    = useState('');
  const [historyModal,  setHistoryModal] = useState<{ task: TaskItem } | null>(null);

  useEffect(() => {
    fetch(`/api/objectives/${id}`)
      .then(r => r.json())
      .then(d => {
        setObjective(d.objective);
        // Ouvrir tous les plans par défaut
        const ids = new Set<string>(d.objective?.plans?.map((p: PlanItem) => p.id) ?? []);
        setExpandedPlans(ids);
      })
      .catch(() => toast.error('Erreur lors du chargement'))
      .finally(() => setLoading(false));
  }, [id]);

  const togglePlan = (planId: string) => {
    setExpandedPlans(prev => {
      const next = new Set(prev);
      next.has(planId) ? next.delete(planId) : next.add(planId);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cet objectif ?')) return;
    try {
      const res = await fetch(`/api/objectives/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Objectif supprimé');
      router.push('/objectives');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleUnlock = async () => {
    if (!confirm('Déverrouiller cet objectif ?')) return;
    try {
      const res = await fetch(`/api/objectives/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEvaluated: false }),
      });
      if (!res.ok) throw new Error();
      setObjective(prev => prev ? { ...prev, isEvaluated: false, evaluatedAt: null } : prev);
      toast.success('Objectif déverrouillé');
    } catch {
      toast.error('Erreur lors du déverrouillage');
    }
  };

  const handleStatusChange = (planId: string, taskId: string, newStatus: string) => {
    setObjective(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        plans: prev.plans.map(p => {
          if (p.id !== planId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              if (newStatus === 'termine') {
                return { ...t, status: newStatus, score: 100, evaluationNote: null, hasBeenEvaluated: true };
              }
              return t; // will be updated via modal
            })
          }
        })
      };
    });

    if (newStatus !== 'termine') {
      const plan = objective?.plans.find(p => p.id === planId);
      const task = plan?.tasks.find(t => t.id === taskId);
      if (task) {
        setEvalModal({ task: { ...task, status: newStatus }, planId });
        setEvalScore(task.score ?? '');
        setEvalNote(task.evaluationNote ?? '');
      }
    }
  };

  const confirmEvaluation = () => {
    if (!evalModal) return;
    const s = typeof evalScore === 'number' ? evalScore : parseInt(evalScore as string, 10);
    const validScore = isNaN(s) ? 0 : Math.max(0, Math.min(99, s));

    setObjective(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        plans: prev.plans.map(p => {
          if (p.id !== evalModal.planId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== evalModal.task.id) return t;
              return {
                ...t,
                status: evalModal.task.status,
                score: validScore,
                evaluationNote: evalNote,
                hasBeenEvaluated: true
              };
            })
          }
        })
      };
    });
    setEvalModal(null);
  };

  const addAdminNote = async () => {
    if (!noteModal || !adminNote.trim()) return;

    const newNote = {
      note: adminNote.trim(),
      createdAt: new Date().toISOString()
    };

    // Update local state first
    const updatedObjective = objective ? {
      ...objective,
      plans: objective.plans.map(p => {
        if (p.id !== noteModal.planId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id !== noteModal.task.id) return t;
            return {
              ...t,
              adminNotes: [
                ...(t.adminNotes || []),
                newNote
              ]
            };
          })
        }
      })
    } : null;

    setObjective(updatedObjective);
    setNoteModal(null);
    setAdminNote('');

    // Save to server with updated state
    try {
      const res = await fetch(`/api/objectives/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: updatedObjective?.plans }),
      });
      if (!res.ok) throw new Error();
      toast.success('Note ajoutée');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const saveEvaluation = async () => {
    try {
      const res = await fetch(`/api/objectives/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: objective?.plans, isEvaluated: true }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setObjective(updated.objective);
      setIsEvaluating(false);
      toast.success('Évaluation enregistrée');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // ─── Skeleton ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!objective) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Objectif introuvable.</p>
        <Link href="/objectives"><Button className="mt-4" variant="outline">Retour</Button></Link>
      </div>
    );
  }

  const globalScore = computeGlobalScore(objective.plans);
  const allTasks    = objective.plans.flatMap(p => p.tasks);
  const responded   = allTasks.filter(t => t.respondedAt).length;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/objectives">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold leading-tight">
            <ClipboardList className="h-5 w-5 text-amber-600 shrink-0" />
            <span className="truncate">{objective.title}</span>
          </h1>
        </div>
        {/* Actions header */}
        <div className="flex items-center gap-2 shrink-0">
          {!isEvaluating && (
            <>
              <Link href={`/objectives/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <PenLine className="mr-1.5 h-4 w-4" />
                  Modifier
                </Button>
              </Link>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => setIsEvaluating(true)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                {objective.isEvaluated ? "Modifier l'évaluation" : "Évaluer"}
              </Button>
            </>
          )}
          {isEvaluating && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEvaluating(false)}>
                Annuler
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={saveEvaluation}>
                <Save className="mr-1.5 h-4 w-4" />
                Sauvegarder
              </Button>
            </>
          )}
          {objective.isEvaluated && !isEvaluating && (
            <Button variant="outline" size="sm" onClick={handleUnlock}>
              <Unlock className="mr-1.5 h-4 w-4" />
              Déverrouiller
            </Button>
          )}
          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Carte info générale ── */}
      <Card className={objective.isEvaluated ? 'border-emerald-200 bg-emerald-50/30' : ''}>
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col sm:flex-row gap-4">

            {/* Infos texte */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-amber-100 text-amber-800 border-none text-xs">
                  {PERIOD_LABELS[objective.periodType] ?? objective.periodType}
                </Badge>
                {objective.isEvaluated ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">
                    <Lock className="w-3 h-3 mr-1" />Évalué
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-700 border-none text-xs">
                    <Unlock className="w-3 h-3 mr-1" />En cours
                  </Badge>
                )}
                {objective.inheritedFrom && (
                  <Badge variant="secondary" className="text-xs">
                    Hérité de : {objective.inheritedFrom.title}
                  </Badge>
                )}
              </div>

              {objective.description && (
                <p className="text-sm text-muted-foreground">{objective.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  Du {formatDate(objective.startDate)} au {formatDate(objective.endDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Créé le {formatDate(objective.createdAt)}
                </span>
                {objective.isEvaluated && objective.evaluatedAt && (
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <Lock className="h-4 w-4" />
                    Évalué le {formatDate(objective.evaluatedAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Score global */}
            <div className="flex flex-col items-center justify-center gap-1 shrink-0">
              <ProgressRing value={globalScore} size={72} />
              <p className="text-xs text-muted-foreground font-medium">Score global</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats rapides ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-white p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{objective.plans.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Plan(s)</p>
        </div>
        <div className="rounded-xl border bg-white p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{allTasks.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Tâche(s)</p>
        </div>
        <div className="rounded-xl border bg-emerald-50 border-emerald-100 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">
            {allTasks.filter(t => t.status === 'termine').length}
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">Terminée(s)</p>
        </div>
        <div className={`rounded-xl border p-3 text-center ${responded === allTasks.length && allTasks.length > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
          <p className={`text-2xl font-bold ${responded === allTasks.length && allTasks.length > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {responded}/{allTasks.length}
          </p>
          <p className={`text-xs mt-0.5 ${responded === allTasks.length && allTasks.length > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            Réponse(s)
          </p>
        </div>
      </div>

      {/* ── Plans & Tâches ── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Plans & Tâches</h2>

        {objective.plans.map(plan => {
          const planScore  = computePlanScore(plan.tasks);
          const isExpanded = expandedPlans.has(plan.id);
          const doneCount  = plan.tasks.filter(t => t.status === 'termine').length;

          return (
            <Card key={plan.id} className="overflow-hidden">
              {/* En-tête plan */}
              <button
                className="w-full flex items-center gap-3 bg-amber-50 border-b border-amber-100 px-4 py-3 hover:bg-amber-100/60 transition-colors"
                onClick={() => togglePlan(plan.id)}
              >
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <span className="font-semibold text-amber-900 text-sm">{plan.name}</span>
                  <span className="text-xs text-amber-700">
                    {doneCount}/{plan.tasks.length} tâche(s) terminée(s)
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ProgressBar value={planScore} />
                  <span className={`text-xs font-bold w-10 text-right
                    ${planScore >= 75 ? 'text-emerald-600' : planScore >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                    {planScore}%
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-amber-600" /> : <ChevronDown className="h-4 w-4 text-amber-600" />}
                </div>
              </button>

              {/* Tâches */}
              {isExpanded && (
                <CardContent className="p-0">
                  {plan.tasks.map((task, ti) => {
                    const hasResponded = !!task.respondedAt;
                    const responsible  = task.responsibleType === 'personne' ? task.personName : task.teamName;

                    return (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-gray-50/80 transition-colors
                          ${ti % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                      >
                        {/* Numéro */}
                        <span className="text-xs text-gray-400 w-5 shrink-0 font-mono">{ti + 1}</span>

                        {/* Icône statut */}
                        <div className="shrink-0">
                          {task.status === 'termine'
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            : task.status === 'en_cours'
                            ? <Circle className="h-4 w-4 text-blue-400" />
                            : task.status === 'bloque'
                            ? <Circle className="h-4 w-4 text-red-400" />
                            : <Circle className="h-4 w-4 text-gray-300" />
                          }
                        </div>

                        {/* Titre tâche */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                          {task.department && (
                            <p className="text-xs text-muted-foreground">{task.department}</p>
                          )}
                        </div>

                        {/* Badge statut général ou édition */}
                        {isEvaluating ? (
                          <div className="shrink-0 w-[120px]">
                            <Select value={task.status} onValueChange={(v) => handleStatusChange(plan.id, task.id, v)}>
                              <SelectTrigger className="h-7 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                  <SelectItem key={val} value={val}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 items-end shrink-0 hidden sm:flex">
                            <Badge className={`text-xs border-none ${STATUS_COLORS[task.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABELS[task.status] ?? task.status}
                            </Badge>
                            {task.hasBeenEvaluated && (
                              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 font-medium tracking-wide max-w-[250px] truncate block">
                                Évalué ({task.score}%){task.evaluationNote ? ` - ${task.evaluationNote}` : ''}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                              onClick={() => {
                                setNoteModal({ task, planId: plan.id });
                                setAdminNote('');
                              }}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Noter
                            </Button>
                            {(task.adminNotes?.length || 0) > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-violet-700 hover:text-violet-800 hover:bg-violet-50"
                                onClick={() => setHistoryModal({ task })}
                              >
                                <ClipboardList className="h-3 w-3 mr-1" />
                                Historique
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Responsable avec indicateur réponse */}
                        {responsible && (
                          <button
                            onClick={() => hasResponded && setModalTask(task)}
                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors shrink-0
                              ${hasResponded
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer'
                                : 'bg-gray-100 text-gray-500 cursor-default'
                              }`}
                          >
                            {task.responsibleType === 'personne'
                              ? <User className="h-3 w-3" />
                              : <Users className="h-3 w-3" />
                            }
                            <span className="max-w-[100px] truncate">{responsible}</span>
                            {hasResponded && <MessageSquare className="h-3 w-3 ml-0.5" />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Légende réponses ── */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-4">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-200" />
          Vert = a répondu (cliquer pour voir)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-gray-200" />
          Gris = pas encore répondu
        </span>
      </div>

      {/* ── Modal réponse ── */}
      {modalTask && <ResponseModal task={modalTask} onClose={() => setModalTask(null)} />}

      {/* ── Modal Historique ── */}
      {historyModal && <HistoryModal task={historyModal.task} onClose={() => setHistoryModal(null)} />}

      {/* ── Modal Évaluation (Inline) ── */}
      {evalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">Évaluer la tâche</h3>
            <p className="text-sm text-gray-600 font-medium">Statut choisi : <Badge variant="outline">{STATUS_LABELS[evalModal.task.status]}</Badge></p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Niveau d'accomplissement (%)</Label>
                <Input
                  type="number"
                  min={0} max={99}
                  value={evalScore}
                  onChange={e => setEvalScore(e.target.value)}
                  placeholder="Ex: 50"
                />
              </div>
              <div className="space-y-1">
                <Label>Note de suivi (optionnelle)</Label>
                <Textarea
                  value={evalNote}
                  onChange={e => setEvalNote(e.target.value)}
                  placeholder="Ajouter un commentaire ou une justification..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEvalModal(null)}>Annuler</Button>
              <Button onClick={confirmEvaluation} className="bg-amber-600 hover:bg-amber-700">Valider</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Note Administration ── */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-600" />
              Note pour le responsable
            </h3>
            <p className="text-sm text-gray-600 font-medium">{noteModal.task.title}</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Votre note</Label>
                <Textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="Ajouter une note pour la personne responsable..."
                  rows={4}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setNoteModal(null)}>Annuler</Button>
              <Button onClick={addAdminNote} className="bg-amber-600 hover:bg-amber-700">Ajouter</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


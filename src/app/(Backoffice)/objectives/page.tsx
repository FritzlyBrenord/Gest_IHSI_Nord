'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ClipboardList, Plus, Clock, MoreHorizontal, Eye, PenLine, Trash2,
  Lock, Unlock, Search, ChevronLeft, ChevronRight, Filter,
  CalendarDays, CheckCircle2, Circle, AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskItem {
  id: string;
  title: string;
  status: string;
  department: string;
  responsibleType: string;
  personId: string | null;
  teamId: string | null;
  respondedAt?: string | null;
  score?: number;
}

interface PlanItem {
  id: string;
  name: string;
  tasks: TaskItem[];
}

interface ObjectiveItem {
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

const PERIOD_TYPES = [
  { value: 'all',          label: 'Tous les types' },
  { value: 'hebdomadaire', label: 'Hebdomadaire' },
  { value: 'mensuel',      label: 'Mensuel' },
  { value: 'trimestriel',  label: 'Trimestriel' },
  { value: 'semestriel',   label: 'Semestriel' },
  { value: 'annuel',       label: 'Annuel' },
];

const PERIOD_LABELS: Record<string, string> = {
  hebdomadaire: 'Hebdomadaire',
  mensuel:      'Mensuel',
  trimestriel:  'Trimestriel',
  semestriel:   'Semestriel',
  annuel:       'Annuel',
};

const PERIOD_COLORS: Record<string, string> = {
  hebdomadaire: 'bg-blue-100 text-blue-700',
  mensuel:      'bg-purple-100 text-purple-700',
  trimestriel:  'bg-orange-100 text-orange-700',
  semestriel:   'bg-pink-100 text-pink-700',
  annuel:       'bg-gray-100 text-gray-700',
};

const PAGE_SIZE = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function computePlanScore(tasks: TaskItem[]): number {
  if (!tasks.length) return 0;
  return Math.round(tasks.reduce((acc, t) => acc + (t.score || 0), 0) / tasks.length);
}

function computeGlobalScore(plans: PlanItem[]): number {
  if (!plans.length) return 0;
  const total = plans.reduce((sum, p) => sum + computePlanScore(p.tasks), 0);
  return Math.round(total / plans.length);
}

function countResponded(plans: PlanItem[]): { responded: number; total: number } {
  const tasks = plans.flatMap(p => p.tasks);
  return {
    responded: tasks.filter(t => t.respondedAt).length,
    total: tasks.length,
  };
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : score >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-700 bg-red-50 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${color}`}>
      {score}%
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<ObjectiveItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [evalFilter, setEvalFilter] = useState('all'); // all | en_cours | evalue
  const [page, setPage]             = useState(1);

  useEffect(() => {
    fetch('/api/objectives')
      .then(r => r.json())
      .then(d => setObjectives(d.objectives || []))
      .catch(() => toast.error('Erreur lors du chargement'))
      .finally(() => setLoading(false));
  }, []);

  // ─── Logique création ──────────────────────────────────────────────────────
  const canCreate = objectives.length === 0 || objectives.every(o => o.isEvaluated);

  // ─── Années disponibles ────────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set(objectives.map(o => new Date(o.startDate).getFullYear()));
    [new Date().getFullYear(), new Date().getFullYear() - 1].forEach(y => years.add(y));
    return Array.from(years).sort((a, b) => b - a);
  }, [objectives]);

  // ─── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return objectives.filter(o => {
      const year  = new Date(o.startDate).getFullYear();
      const matchYear  = yearFilter === 'all' || year === Number(yearFilter);
      const matchType  = typeFilter === 'all' || o.periodType === typeFilter;
      const matchEval  = evalFilter === 'all'
        || (evalFilter === 'en_cours' && !o.isEvaluated)
        || (evalFilter === 'evalue'   &&  o.isEvaluated);
      const matchSearch = !search.trim()
        || o.title.toLowerCase().includes(search.toLowerCase());
      return matchYear && matchType && matchEval && matchSearch;
    });
  }, [objectives, search, typeFilter, yearFilter, evalFilter]);

  // ─── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet objectif ?')) return;
    try {
      const res = await fetch(`/api/objectives/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setObjectives(prev => prev.filter(o => o.id !== id));
      toast.success('Objectif supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleUnlock = async (id: string) => {
    if (!confirm('Déverrouiller cet objectif ?')) return;
    try {
      const res = await fetch(`/api/objectives/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEvaluated: false }),
      });
      if (!res.ok) throw new Error();
      setObjectives(prev => prev.map(o =>
        o.id === id ? { ...o, isEvaluated: false, evaluatedAt: null, globalScore: null } : o
      ));
      toast.success('Objectif déverrouillé');
    } catch {
      toast.error('Erreur lors du déverrouillage');
    }
  };

  // ─── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-52" />
        <div className="grid gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // ─── Stats rapides ────────────────────────────────────────────────────────
  const total    = objectives.length;
  const enCours  = objectives.filter(o => !o.isEvaluated).length;
  const evalues  = objectives.filter(o =>  o.isEvaluated).length;

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardList className="h-6 w-6 text-amber-600" />
            Objectifs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} objectif(s) enregistré(s)</p>
        </div>

        {canCreate ? (
          <Link href="/objectives/new">
            <Button className="bg-amber-600 hover:bg-amber-700">
              <Plus className="mr-2 h-4 w-4" />
              Nouvel objectif
            </Button>
          </Link>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Évaluez l&apos;objectif en cours avant d&apos;en créer un nouveau
          </div>
        )}
      </div>

      {/* ── Stats rapides ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total</p>
        </div>
        <div className="rounded-xl border bg-blue-50 border-blue-100 p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{enCours}</p>
          <p className="text-xs text-blue-600 mt-0.5">En cours</p>
        </div>
        <div className="rounded-xl border bg-emerald-50 border-emerald-100 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{evalues}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Évalués</p>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="rounded-xl border bg-gray-50 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
          <Filter className="h-3.5 w-3.5" />
          Filtres
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Recherche */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 h-9 text-sm bg-white"
            />
          </div>

          {/* Type */}
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm bg-white">
              <SelectValue placeholder="Type de période" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_TYPES.map(pt => (
                <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Année */}
          <Select value={yearFilter} onValueChange={v => { setYearFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm bg-white">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes années</SelectItem>
              {availableYears.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Statut évaluation */}
          <Select value={evalFilter} onValueChange={v => { setEvalFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm bg-white">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="evalue">Évalués</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length !== total && (
        <p className="text-xs text-muted-foreground">{filtered.length} résultat(s) trouvé(s)</p>
      )}

      {/* ── Liste ── */}
      {paginated.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 font-medium text-muted-foreground">Aucun objectif trouvé</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Essayez de modifier vos filtres</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {paginated.map(obj => {
            const score      = computeGlobalScore(obj.plans);
            const { responded, total: totalTasks } = countResponded(obj.plans);
            const totalPlanTasks = obj.plans.flatMap(p => p.tasks).length;

            return (
              <Card
                key={obj.id}
                className={`transition-all hover:shadow-md border
                  ${obj.isEvaluated ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-white'}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">

                    {/* Icône statut */}
                    <div className="mt-0.5 shrink-0">
                      {obj.isEvaluated
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        : <Circle className="h-5 w-5 text-blue-400" />
                      }
                    </div>

                    {/* Contenu principal */}
                    <div className="flex-1 min-w-0 space-y-2">

                      {/* Ligne titre + badges */}
                      <div className="flex flex-wrap items-start gap-2">
                        <Link
                          href={`/objectives/${obj.id}`}
                          className="font-semibold text-gray-900 hover:text-amber-700 transition-colors leading-tight"
                        >
                          {obj.title}
                        </Link>
                        <Badge className={`text-xs border-none shrink-0 ${PERIOD_COLORS[obj.periodType] ?? 'bg-gray-100 text-gray-700'}`}>
                          {PERIOD_LABELS[obj.periodType] ?? obj.periodType}
                        </Badge>
                        {obj.isEvaluated ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs shrink-0">
                            <Lock className="w-3 h-3 mr-1" />Évalué
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-700 border-none text-xs shrink-0">
                            <Unlock className="w-3 h-3 mr-1" />En cours
                          </Badge>
                        )}
                      </div>

                      {/* Description */}
                      {obj.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{obj.description}</p>
                      )}

                      {/* Méta : période + plans + réponses */}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(obj.startDate)} → {formatDate(obj.endDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClipboardList className="h-3.5 w-3.5" />
                          {obj.plans.length} plan(s) · {totalPlanTasks} tâche(s)
                        </span>
                        <span className={`flex items-center gap-1 ${responded === totalTasks && totalTasks > 0 ? 'text-emerald-600' : responded > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                          <AlertCircle className="h-3.5 w-3.5" />
                          {responded}/{totalTasks} réponse(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Créé le {formatDate(obj.createdAt)}
                        </span>
                      </div>

                      {/* Barre de progression */}
                      <div className="flex items-center gap-2">
                        <ProgressBar value={score} />
                        <ScoreBadge score={score} />
                      </div>

                      {/* Plans mini */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {obj.plans.map(plan => {
                          const ps = computePlanScore(plan.tasks);
                          return (
                            <span key={plan.id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {plan.name}
                              <span className={`font-bold ${ps >= 75 ? 'text-emerald-600' : ps >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                {ps}%
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/objectives/${obj.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir le détail
                          </Link>
                        </DropdownMenuItem>
                        {!obj.isEvaluated && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/objectives/${obj.id}/edit`}>
                                <PenLine className="mr-2 h-4 w-4" />
                                Modifier
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/objectives/${obj.id}`}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Évaluer
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}
                        {obj.isEvaluated && (
                          <DropdownMenuItem onClick={() => handleUnlock(obj.id)}>
                            <Unlock className="mr-2 h-4 w-4" />
                            Déverrouiller
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(obj.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            Page {safePage} / {totalPages} · {filtered.length} résultat(s)
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline" size="sm"
              className="h-8 w-8 p-0"
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`e-${i}`} className="px-1 text-xs text-gray-400">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={safePage === p ? 'default' : 'outline'}
                    size="sm"
                    className={`h-8 w-8 p-0 text-xs ${safePage === p ? 'bg-amber-600 hover:bg-amber-700 border-amber-600' : ''}`}
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </Button>
                )
              )}
            <Button
              variant="outline" size="sm"
              className="h-8 w-8 p-0"
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  ClipboardList,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PERIOD_TYPES = [
  { value: 'hebdomadaire', label: 'Hebdomadaire' },
  { value: 'mensuel',      label: 'Mensuel' },
  { value: 'trimestriel',  label: 'Trimestriel' },
  { value: 'semestriel',   label: 'Semestriel' },
  { value: 'annuel',       label: 'Annuel' },
];

const DEPARTMENTS = ['Administration', 'Informatique', 'Statistique', 'Logistique', 'Menagere'];

const PLANS_DEFAULT = ['Plan Informatique', 'Plan Statistique', 'Plan Management'];

const STATUSES = [
  { value: 'a_faire',  label: 'À faire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine',  label: 'Terminé' },
  { value: 'bloque',   label: 'Bloqué' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  poste?: string;
}

interface Team {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  responsibleType: 'personne' | 'equipe' | '';
  department: string;
  personId: string;
  teamId: string;
}

interface Plan {
  id: string;
  name: string;
  tasks: Task[];
  expanded: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FRENCH_MONTHS = [
  'janvier','février','mars','avril','mai','juin',
  'juillet','août','septembre','octobre','novembre','décembre',
];

function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return Math.ceil((date.getDate() + ((firstDay + 6) % 7)) / 7);
}

function ordinal(n: number): string {
  return n === 1 ? '1er' : `${n}ème`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${FRENCH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function generateTitle(type: string, startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate + 'T00:00:00');
  const month = FRENCH_MONTHS[start.getMonth()];
  const year  = start.getFullYear();

  switch (type) {
    case 'hebdomadaire': {
      const week = getWeekOfMonth(start);
      return `Objectif hebdomadaire — ${ordinal(week)} semaine de ${month} ${year} (du ${formatDate(startDate)} au ${formatDate(endDate)})`;
    }
    case 'mensuel': {
      const monthNum = start.getMonth() + 1;
      return `Objectif mensuel — ${ordinal(monthNum)} mois de ${year} (${month.charAt(0).toUpperCase() + month.slice(1)})`;
    }
    case 'trimestriel': {
      const quarter = Math.ceil((start.getMonth() + 1) / 3);
      return `Objectif trimestriel — ${ordinal(quarter)} trimestre ${year} (du ${formatDate(startDate)} au ${formatDate(endDate)})`;
    }
    case 'semestriel': {
      const sem = start.getMonth() < 6 ? 1 : 2;
      return `Objectif semestriel — ${ordinal(sem)} semestre ${year} (du ${formatDate(startDate)} au ${formatDate(endDate)})`;
    }
    case 'annuel':
      return `Objectif annuel — Année ${year}`;
    default:
      return `Objectif du ${formatDate(startDate)} au ${formatDate(endDate)}`;
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function makeTask(): Task {
  return { id: uid(), title: '', status: 'a_faire', responsibleType: '', department: '', personId: '', teamId: '' };
}

function makePlan(name: string): Plan {
  return { id: uid(), name, tasks: [makeTask()], expanded: true };
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

const STEPS = ['Type', 'Période', 'Titre', 'Plans & Tâches', 'Résumé'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                ${i < current  ? 'bg-amber-600 border-amber-600 text-white'  :
                  i === current ? 'bg-white border-amber-600 text-amber-600' :
                                  'bg-white border-gray-200 text-gray-400'}`}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-xs whitespace-nowrap ${i === current ? 'text-amber-700 font-semibold' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-8 md:w-16 mb-5 mx-1 ${i < current ? 'bg-amber-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function NewObjectivePage() {
  const router = useRouter();
  const [step, setStep]           = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Étape 1
  const [periodType, setPeriodType] = useState('');

  // Étape 2
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');

  // Étape 3
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');

  // Étape 4
  const [plans, setPlans] = useState<Plan[]>(PLANS_DEFAULT.map(makePlan));
  const [inheritedFromId, setInheritedFromId] = useState<string | null>(null);
  const [inheritedTitle, setInheritedTitle] = useState<string | null>(null);

  // ─── Héritage automatique ───────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/objectives')
      .then(r => r.json())
      .then(d => {
        if (d.objectives && d.objectives.length > 0) {
          const latest = d.objectives[0]; // Déjà trié par date décroissante par l'API
          if (latest && latest.plans && latest.plans.length > 0) {
            setInheritedFromId(latest.id);
            setInheritedTitle(latest.title);
            const inheritedPlans = latest.plans.map((p: any) => ({
              id: uid(),
              name: p.name,
              expanded: true,
              tasks: p.tasks.map((t: any) => ({
                id: uid(),
                title: t.title,
                status: 'a_faire', // On remet le statut à zéro pour la nouvelle période
                responsibleType: t.responsibleType || '',
                department: t.department || '',
                personId: t.personId || '',
                teamId: t.teamId || '',
              }))
            }));
            setPlans(inheritedPlans);
          }
        }
      })
      .catch(console.error);
  }, []);

  // Cache des données API par département
  const [employeesCache, setEmployeesCache] = useState<Record<string, Employee[]>>({});
  const [teamsCache,     setTeamsCache]     = useState<Record<string, Team[]>>({});
  const [loadingDept,    setLoadingDept]    = useState<string | null>(null);

  // ─── Chargement par département ─────────────────────────────────────────────

  const loadDepartmentData = useCallback(async (dept: string) => {
    if (employeesCache[dept] !== undefined) return; // déjà chargé
    setLoadingDept(dept);
    try {
      const [empRes, teamRes] = await Promise.all([
        fetch(`/api/employees?department=${encodeURIComponent(dept)}&status=active&limit=100`),
        fetch(`/api/teams?department=${encodeURIComponent(dept)}`),
      ]);

      const empData  = empRes.ok  ? await empRes.json()  : { employees: [] };
      const teamData = teamRes.ok ? await teamRes.json() : { teams: [] };

      setEmployeesCache(prev => ({ ...prev, [dept]: empData.employees ?? [] }));
      setTeamsCache(prev     => ({ ...prev, [dept]: teamData.teams    ?? [] }));
    } catch {
      toast.error(`Erreur lors du chargement du département ${dept}`);
      setEmployeesCache(prev => ({ ...prev, [dept]: [] }));
      setTeamsCache(prev     => ({ ...prev, [dept]: [] }));
    } finally {
      setLoadingDept(null);
    }
  }, [employeesCache]);

  // Précharger quand on arrive à l'étape des plans
  useEffect(() => {
    if (step === 3) {
      // Récupérer tous les départements déjà utilisés dans les tâches
      const usedDepts = new Set(
        plans.flatMap(p => p.tasks.map(t => t.department)).filter(Boolean)
      );
      usedDepts.forEach(dept => loadDepartmentData(dept));
    }
  }, [step, plans, loadDepartmentData]);

  // ─── Navigation ─────────────────────────────────────────────────────────────

  const goNext = () => {
    if (step === 0 && !periodType) {
      toast.error('Veuillez choisir un type de période');
      return;
    }
    if (step === 1) {
      if (!startDate || !endDate) { toast.error('Veuillez saisir les deux dates'); return; }
      if (new Date(endDate) < new Date(startDate)) { toast.error('La date de fin doit être après la date de début'); return; }
      setTitle(generateTitle(periodType, startDate, endDate));
    }
    if (step === 3) {
      const allTasks = plans.flatMap(p => p.tasks.filter(t => t.title.trim()));
      if (allTasks.length === 0) { toast.error('Ajoutez au moins une tâche'); return; }
    }
    setStep(s => s + 1);
  };

  const goBack = () => setStep(s => s - 1);

  // ─── Plans ──────────────────────────────────────────────────────────────────

  const addPlan = () => setPlans(p => [...p, makePlan('')]);

  const removePlan = (planId: string) => setPlans(p => p.filter(pl => pl.id !== planId));

  const updatePlanName = (planId: string, name: string) =>
    setPlans(p => p.map(pl => pl.id === planId ? { ...pl, name } : pl));

  const togglePlan = (planId: string) =>
    setPlans(p => p.map(pl => pl.id === planId ? { ...pl, expanded: !pl.expanded } : pl));

  // ─── Tâches ─────────────────────────────────────────────────────────────────

  const addTask = (planId: string) =>
    setPlans(p => p.map(pl => pl.id === planId ? { ...pl, tasks: [...pl.tasks, makeTask()] } : pl));

  const removeTask = (planId: string, taskId: string) =>
    setPlans(p => p.map(pl =>
      pl.id === planId ? { ...pl, tasks: pl.tasks.filter(t => t.id !== taskId) } : pl
    ));

  const updateTask = (planId: string, taskId: string, field: keyof Task, value: string) => {
    setPlans(p => p.map(pl =>
      pl.id === planId
        ? {
            ...pl,
            tasks: pl.tasks.map(t =>
              t.id === taskId
                ? {
                    ...t,
                    [field]: value,
                    ...(field === 'department' ? { personId: '', teamId: '', responsibleType: '' } : {}),
                    ...(field === 'responsibleType' ? { personId: '', teamId: '' } : {}),
                  }
                : t
            ),
          }
        : pl
    ));

    // Charger les données du département si nécessaire
    if (field === 'department' && value) {
      loadDepartmentData(value);
    }
  };

  // ─── Soumission ─────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          periodType,
          startDate,
          endDate,
          plans: plans.map(pl => ({
            id: pl.id,
            name: pl.name,
            tasks: pl.tasks.filter(t => t.title.trim()),
          })),
          inheritedFromId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création');

      toast.success('Objectif créé avec succès');
      router.push('/objectives');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Résumé : résolution des noms ───────────────────────────────────────────

  const resolveResponsible = (task: Task): string => {
    if (!task.responsibleType) return '—';
    if (task.responsibleType === 'personne') {
      const emp = (employeesCache[task.department] ?? []).find(e => e.id === task.personId);
      return emp ? `${emp.firstName} ${emp.lastName}` : '—';
    }
    const team = (teamsCache[task.department] ?? []).find(t => t.id === task.teamId);
    return team?.name ?? '—';
  };

  const totalTasks = plans.flatMap(p => p.tasks.filter(t => t.title.trim())).length;

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/objectives">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ClipboardList className="h-6 w-6 text-amber-600" />
          Nouvel objectif
        </h1>
      </div>

      {/* Stepper */}
      <div className="overflow-x-auto pb-2">
        <StepIndicator current={step} />
      </div>

      {/* ── Étape 0 : Type ── */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Type de période
              {inheritedTitle && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                  Plans copiés de : {inheritedTitle}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Quel type d&apos;objectif souhaitez-vous créer ?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PERIOD_TYPES.map(pt => (
                <button
                  key={pt.value}
                  onClick={() => setPeriodType(pt.value)}
                  className={`rounded-xl border-2 px-4 py-4 text-left transition-all
                    ${periodType === pt.value
                      ? 'border-amber-600 bg-amber-50 text-amber-800 font-semibold'
                      : 'border-gray-200 hover:border-amber-300 text-gray-700'
                    }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Étape 1 : Période ── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Période concernée</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Définissez la plage de dates de cet objectif.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Date de début *</Label>
                <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Date de fin *</Label>
                <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            {startDate && endDate && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Aperçu du titre : <strong>{generateTitle(periodType, startDate, endDate)}</strong>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Étape 2 : Titre & Description ── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Titre &amp; Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="obj-title">Titre *</Label>
              <Input id="obj-title" value={title} onChange={e => setTitle(e.target.value)} />
              <p className="text-xs text-muted-foreground">Le titre a été généré automatiquement, vous pouvez le modifier.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obj-desc">
                Description <span className="text-muted-foreground">(optionnelle)</span>
              </Label>
              <Textarea
                id="obj-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Contexte ou précisions supplémentaires..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Étape 3 : Plans & Tâches ── */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ajoutez vos plans et les tâches associées. Chaque tâche doit avoir un nom, un statut et un responsable.
          </p>

          {plans.map((plan, pi) => (
            <Card key={plan.id} className="overflow-hidden">
              {/* En-tête plan */}
              <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-100 px-4 py-3">
                <button onClick={() => togglePlan(plan.id)} className="text-amber-700">
                  {plan.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <Input
                  value={plan.name}
                  onChange={e => updatePlanName(plan.id, e.target.value)}
                  placeholder={`Nom du plan ${pi + 1}`}
                  className="border-0 bg-transparent font-semibold text-amber-800 focus-visible:ring-0 p-0 h-auto"
                />
                <Badge variant="outline" className="ml-auto text-xs shrink-0">
                  {plan.tasks.filter(t => t.title.trim()).length} tâche(s)
                </Badge>
                {plans.length > 1 && (
                  <button onClick={() => removePlan(plan.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {plan.expanded && (
                <CardContent className="pt-4 space-y-3">
                  {plan.tasks.map((task, ti) => {
                    const employees = employeesCache[task.department] ?? [];
                    const teams     = teamsCache[task.department]     ?? [];
                    const isLoading = loadingDept === task.department;

                    return (
                      <div key={task.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-3">
                        {/* Nom tâche */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{ti + 1}.</span>
                          <Input
                            value={task.title}
                            onChange={e => updateTask(plan.id, task.id, 'title', e.target.value)}
                            placeholder="Nom de la tâche..."
                            className="h-8 text-sm"
                          />
                          {plan.tasks.length > 1 && (
                            <button onClick={() => removeTask(plan.id, task.id)} className="text-red-400 hover:text-red-600 shrink-0">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Statut + Département + Type responsable */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-7">
                          {/* Statut */}
                          <Select value={task.status} onValueChange={v => updateTask(plan.id, task.id, 'status', v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Statut" />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Département */}
                          <Select
                            value={task.department}
                            onValueChange={v => updateTask(plan.id, task.id, 'department', v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Département" />
                            </SelectTrigger>
                            <SelectContent>
                              {DEPARTMENTS.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Type de responsable */}
                          {task.department && (
                            <Select
                              value={task.responsibleType}
                              onValueChange={v => updateTask(plan.id, task.id, 'responsibleType', v as 'personne' | 'equipe')}
                              disabled={isLoading}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                {isLoading
                                  ? <span className="flex items-center gap-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" />Chargement...</span>
                                  : <SelectValue placeholder="Assigner à..." />
                                }
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="personne">Une personne</SelectItem>
                                {teams.length > 0 && (
                                  <SelectItem value="equipe">Une équipe</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {/* Sélecteur personne */}
                        {task.responsibleType === 'personne' && task.department && (
                          <div className="pl-7">
                            <Select
                              value={task.personId}
                              onValueChange={v => updateTask(plan.id, task.id, 'personId', v)}
                              disabled={isLoading}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={isLoading ? 'Chargement...' : 'Choisir une personne...'} />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.length === 0 && !isLoading && (
                                  <SelectItem value="none" disabled>Aucun employé trouvé</SelectItem>
                                )}
                                {employees.map(emp => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName}
                                    {emp.poste ? ` — ${emp.poste}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Sélecteur équipe */}
                        {task.responsibleType === 'equipe' && task.department && (
                          <div className="pl-7">
                            <Select
                              value={task.teamId}
                              onValueChange={v => updateTask(plan.id, task.id, 'teamId', v)}
                              disabled={isLoading}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={isLoading ? 'Chargement...' : 'Choisir une équipe...'} />
                              </SelectTrigger>
                              <SelectContent>
                                {teams.length === 0 && !isLoading && (
                                  <SelectItem value="none" disabled>Aucune équipe trouvée</SelectItem>
                                )}
                                {teams.map(team => (
                                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => addTask(plan.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une tâche
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed border-amber-400 text-amber-700 hover:bg-amber-50"
            onClick={addPlan}
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un plan
          </Button>
        </div>
      )}

      {/* ── Étape 4 : Résumé ── */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Résumé de l&apos;objectif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Infos générales */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2">
              <p className="text-sm font-bold text-amber-900">{title}</p>
              {description && <p className="text-sm text-amber-800">{description}</p>}
              <div className="flex gap-4 text-xs text-amber-700 flex-wrap">
                <span>📅 Du {formatDate(startDate)} au {formatDate(endDate)}</span>
                <span>· {PERIOD_TYPES.find(p => p.value === periodType)?.label}</span>
              </div>
            </div>

            {/* Plans */}
            {plans.filter(p => p.tasks.some(t => t.title.trim())).map(plan => (
              <div key={plan.id} className="space-y-2">
                <p className="text-sm font-semibold text-gray-800">{plan.name || 'Plan sans nom'}</p>
                <div className="space-y-1">
                  {plan.tasks.filter(t => t.title.trim()).map((task, i) => {
                    const statusLabel = STATUSES.find(s => s.value === task.status)?.label ?? task.status;
                    const responsible = resolveResponsible(task);
                    return (
                      <div key={task.id} className="flex items-start gap-3 text-sm rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <span className="text-gray-400 text-xs mt-0.5">{i + 1}.</span>
                        <div className="flex-1">
                          <span className="font-medium">{task.title}</span>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">{statusLabel}</Badge>
                            {responsible !== '—' && (
                              <Badge variant="secondary" className="text-xs">{responsible}</Badge>
                            )}
                            {task.department && (
                              <Badge variant="outline" className="text-xs text-gray-500">{task.department}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="border-t pt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>{plans.length} plan(s)</span>
              <span>{totalTasks} tâche(s) au total</span>
            </div>

            <Button
              className="w-full bg-amber-600 hover:bg-amber-700"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement...</>
                : <><Save className="mr-2 h-4 w-4" />Enregistrer l&apos;objectif</>
              }
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        {step > 0 ? (
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Précédent
          </Button>
        ) : (
          <div />
        )}
        {step < 4 && (
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={goNext}>
            Suivant
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
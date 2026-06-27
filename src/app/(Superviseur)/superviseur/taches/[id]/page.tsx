'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LockKeyhole, Users } from 'lucide-react';
import { useSuperviseurDemo } from '@/components/superviseur/superviseur-provider';
import { PriorityBadge, StatusBadge } from '@/components/superviseur/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function SuperviseurTacheDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const {
    incomingTasks,
    memberTasks,
    updateIncomingTaskNotes,
    updateIncomingTaskReport,
    updateIncomingTaskStatus,
  } = useSuperviseurDemo();
  const [taskId, setTaskId] = useState('');
  const [notesDraftById, setNotesDraftById] = useState<Record<string, string>>({});
  const [reportDraftById, setReportDraftById] = useState<Record<string, string>>({});

  useEffect(() => {
    params.then((value) => setTaskId(value.id));
  }, [params]);

  const task = incomingTasks.find((item) => item.id === taskId) || null;

  if (!task) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Tache introuvable.</p>
        <Button className="mt-4" onClick={() => router.push('/superviseur/taches')}>
          Retour
        </Button>
      </div>
    );
  }

  const isLocked = task.statut === 'termine';
  const notes = notesDraftById[task.id] ?? task.notesSuperviseur;
  const report = reportDraftById[task.id] ?? task.rapportSuperviseur;
  const relatedAssignments = memberTasks.filter((item) => item.dateDebut >= task.dateDebut && item.dateFin <= task.dateFin);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-xl">
          <Link href="/superviseur/taches">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-950">{task.titre}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Source: {task.source} | du {new Date(task.dateDebut).toLocaleDateString('fr-FR')} au{' '}
            {new Date(task.dateFin).toLocaleDateString('fr-FR')}
          </p>
        </div>
        {isLocked ? (
          <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <LockKeyhole className="mr-2 h-3.5 w-3.5" />
            Fiche verrouillee
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Execution et rapport du superviseur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={task.statut} />
              <PriorityBadge priority={task.priorite} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-7 text-slate-600">{task.description}</p>
            </div>

            <div className="space-y-2">
              <Label>Notes du superviseur</Label>
              <Textarea
                rows={5}
                disabled={isLocked}
                value={notes}
                onChange={(event) =>
                  setNotesDraftById((current) => ({
                    ...current,
                    [task.id]: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Rapport du superviseur</Label>
              <Textarea
                rows={7}
                disabled={isLocked}
                value={report}
                onChange={(event) =>
                  setReportDraftById((current) => ({
                    ...current,
                    [task.id]: event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={isLocked}
                onClick={() => {
                  updateIncomingTaskNotes(task.id, notes);
                  updateIncomingTaskReport(task.id, report);
                }}
              >
                Sauvegarder
              </Button>
              <Button asChild variant="outline">
                <Link href="/superviseur/equipe">Distribuer dans l equipe</Link>
              </Button>
            </div>

            {isLocked ? (
              <p className="text-xs text-slate-500">
                Cette tache est marquee comme terminee. Le statut, les notes et le rapport sont maintenant figes.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Changer le statut</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={task.statut}
                disabled={isLocked}
                onValueChange={(value: 'a_faire' | 'en_cours' | 'termine' | 'en_retard') =>
                  updateIncomingTaskStatus(task.id, value)
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
              <p className="text-xs text-slate-500">
                Passer en "Termine" verrouille toute modification future sur cette tache recue.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Taches equipe liees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {relatedAssignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Aucune sous-tache equipe n a encore ete creee pour cette periode.
                </div>
              ) : (
                relatedAssignments.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{item.titre}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Du {new Date(item.dateDebut).toLocaleDateString('fr-FR')} au{' '}
                          {new Date(item.dateFin).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <StatusBadge status={item.statut} />
                    </div>
                  </div>
                ))
              )}
              <Button asChild variant="outline" className="w-full">
                <Link href="/superviseur/equipe">
                  <Users className="mr-2 h-4 w-4" />
                  Ouvrir l equipe
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ClipboardList, Search, UserRoundX, Users } from 'lucide-react';
import { useSuperviseurDemo } from '@/components/superviseur/superviseur-provider';
import { EmptyState, StatusBadge, getInitials } from '@/components/superviseur/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SuperviseurEquipePage() {
  const { teams, memberTasks, toggleMemberStatus } = useSuperviseurDemo();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'tous' | 'actif' | 'inactif'>('tous');
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      setSelectedTeamId(teams[0].id);
    }
  }, [selectedTeamId, teams]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) || teams[0] || null,
    [selectedTeamId, teams]
  );

  const teamMembers = selectedTeam?.members || [];

  const filteredMembers = useMemo(() => {
    return teamMembers.filter((member) => {
      const fullName = `${member.firstName || member.prenom || ''} ${member.lastName || member.nom || ''}`;
      const role = member.position || member.poste || '';
      const haystack = `${fullName} ${role} ${member.email}`.toLowerCase();
      const matchSearch = haystack.includes(search.trim().toLowerCase());
      const memberIsActive = Boolean(member.isActive ?? (member.statut ? member.statut === 'actif' : false));
      const matchFilter = filter === 'tous' ? true : (memberIsActive ? 'actif' : 'inactif') === filter;
      return matchSearch && matchFilter;
    });
  }, [filter, search, teamMembers]);

  const pendingMember = teamMembers.find((member) => member.id === pendingMemberId) || null;
  const activeMembers = teamMembers.filter((member) => Boolean(member.isActive ?? (member.statut ? member.statut === 'actif' : false))).length;
  const completedTasks = selectedTeam
    ? memberTasks.filter((task) => selectedTeam.members.some((member) => member.id === task.membreId) && task.statut === 'termine').length
    : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Gestion des equipes</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Les equipes rattachees a votre compte superviseur sont chargees depuis la base de donnees. Choisissez
          une equipe pour voir ses membres, leurs taches et leurs statuts.
        </p>
      </div>

      {teams.length === 0 ? (
        <EmptyState
          title="Aucune equipe rattachee"
          description="Nous n'avons pas trouve d'equipe associee a ce superviseur dans la base de donnees."
          icon={<Users className="h-6 w-6" />}
        />
      ) : (
        <>
          {/* <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => {
              const isSelected = team.id === selectedTeam?.id;
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setSelectedTeamId(team.id)}
                  className="text-left"
                >
                  <Card
                    className={`h-full border-slate-200 bg-white shadow-sm transition-all duration-200 ${
                      isSelected ? 'ring-2 ring-emerald-500' : ''
                    }`}
                  >
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Equipe</p>
                          <h2 className="mt-1 text-lg font-semibold text-slate-950">{team.name}</h2>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {team.members.length} membre(s)
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-slate-500">
                        <p>
                          Superviseur: {team.supervisor.firstName || team.supervisor.prenom || ''} {team.supervisor.lastName || team.supervisor.nom || ''}
                        </p>
                        <p>{team.supervisor.position || team.supervisor.poste || ''}</p>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-medium text-slate-700">
                          {isSelected ? 'Equipe active' : 'Voir les membres'}
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div> */}

          {selectedTeam ? (
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="grid gap-4 p-5 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Equipe active</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">{selectedTeam.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Membres actifs</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">{activeMembers}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Taches terminees</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">{completedTasks}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un membre..."
                />
              </div>
              <Select value={filter} onValueChange={(value: 'tous' | 'actif' | 'inactif') => setFilter(value)}>
                <SelectTrigger className="w-full md:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous</SelectItem>
                  <SelectItem value="actif">Actifs</SelectItem>
                  <SelectItem value="inactif">Inactifs</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {filteredMembers.length === 0 ? (
            <EmptyState
              title="Aucun membre visible"
              description="Ajustez votre recherche ou votre filtre de statut pour retrouver une personne."
              icon={<Users className="h-6 w-6" />}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredMembers.map((member) => {
                const tasksForMember = memberTasks.filter((task) => task.membreId === member.id);
                const completedCount = tasksForMember.filter((task) => task.statut === 'termine').length;

                return (
                  <Card
                    key={member.id}
                    className={`border-slate-200 bg-white shadow-sm transition-all duration-200 ${
                    !Boolean(member.isActive ?? (member.statut ? member.statut === 'actif' : false)) ? 'opacity-75' : ''
                    }`}
                  >
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border border-slate-200">
                            <AvatarFallback className="bg-emerald-50 text-emerald-700">
                              {getInitials(`${member.firstName || member.prenom || ''} ${member.lastName || member.nom || ''}`)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-slate-950">
                              {member.firstName || member.prenom || ''} {member.lastName || member.nom || ''}
                            </p>
                            <p className="text-sm text-slate-500">{member.position || member.poste || ''}</p>
                          </div>
                        </div>
                        <StatusBadge status={Boolean(member.isActive ?? (member.statut ? member.statut === 'actif' : false)) ? 'actif' : 'inactif'} />
                      </div>

                      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Taches assignees
                          </p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">{tasksForMember.length}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Taches terminees
                          </p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">{completedCount}</p>
                        </div>
                      </div>

                      <div className="space-y-1 text-sm text-slate-500">
                        <p>{member.email}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button asChild className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700">
                          <Link href={`/superviseur/equipe/${member.id}`}>
                            Ouvrir la fiche
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setPendingMemberId(member.id)}
                        >
                          <UserRoundX className="mr-2 h-4 w-4" />
                          {member.isActive ? 'Inactiver' : 'Activer'}
                        </Button>
                      </div>

                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">
                        <ClipboardList className="mb-2 h-4 w-4 text-slate-400" />
                        Cliquez sur "Ouvrir la fiche" pour creer une tache, voir les details, suivre le rapport et valider le resultat.
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <AlertDialog open={Boolean(pendingMember)} onOpenChange={(open) => !open && setPendingMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le changement de statut</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMember
                ? `Etes-vous sur de vouloir ${
                    pendingMember.isActive ? 'rendre inactif' : 'reactiver'
                  } ${pendingMember.firstName || pendingMember.prenom || ''} ${pendingMember.lastName || pendingMember.nom || ''} ?`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingMemberId) toggleMemberStatus(pendingMemberId);
                setPendingMemberId(null);
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

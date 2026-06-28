'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, Plus, MoreHorizontal, Trash2, Eye, Users, Clock, MapPin, Video, Play, Square, FileText, Files, Search } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { fetchJsonOrThrow } from '@/lib/fetch-json';

interface Participant {
  id: string;
  employeeId: string;
  wasPresent: boolean;
  attendanceMode: 'PRESENTIEL' | 'EN_LIGNE' | null;
  employee: { id: string; firstName: string; lastName: string; poste: string; photoUrl: string | null };
}

interface Meeting {
  id: string;
  category: string;
  title: string;
  description: string | null;
  reportResponsible?: { firstName: string; lastName: string; poste: string } | null;
  startAt: string;
  durationMins: number;
  type: string;
  location: string | null;
  platform: string | null;
  meetingUrl: string | null;
  status: string;
  trainingDocuments?: Array<{ id: string }>;
  participants: Participant[];
  reports?: Array<{ id: string; workflowStatus: string }>;
}

interface MeetingsResponse {
  meetings: Meeting[];
  meeting?: Meeting;
  emailDelivery?: {
    attempted?: boolean;
    failed?: number;
  };
}

const statusLabels: Record<string, string> = {
  A_VENIR: 'À venir',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
};

const statusColors: Record<string, string> = {
  A_VENIR: 'bg-amber-100 text-amber-700',
  EN_COURS: 'bg-emerald-100 text-emerald-700',
  TERMINEE: 'bg-gray-100 text-gray-600',
  ANNULEE: 'bg-rose-100 text-rose-700',
};

const typeLabels: Record<string, string> = {
  PRESENTIEL: 'Présentiel',
  EN_LIGNE: 'En ligne',
  HYBRIDE: 'Hybride',
};

const categoryLabels: Record<string, string> = {
  REUNION: 'Réunion',
  FORMATION: 'Formation',
};

const visibleCategories = new Set(['REUNION', 'FORMATION']);

const ITEMS_PER_PAGE = 8;
const MONTH_OPTIONS = [
  { value: '1', label: 'Janvier' },
  { value: '2', label: 'Février' },
  { value: '3', label: 'Mars' },
  { value: '4', label: 'Avril' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Juin' },
  { value: '7', label: 'Juillet' },
  { value: '8', label: 'Août' },
  { value: '9', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function sortMostRecentFirst(a: Meeting, b: Meeting) {
  const startDiff = new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
  if (startDiff !== 0) return startDiff;

  return b.id.localeCompare(a.id);
}

function matchesSearch(meeting: Meeting, search: string) {
  const normalizedSearch = normalizeText(search);
  if (!normalizedSearch) return true;

  const searchableValues = [
    meeting.title,
    meeting.description,
    meeting.location,
    meeting.platform,
    categoryLabels[meeting.category || 'REUNION'] || meeting.category,
    typeLabels[meeting.type] || meeting.type,
    statusLabels[meeting.status] || meeting.status,
    meeting.reportResponsible
      ? `${meeting.reportResponsible.firstName} ${meeting.reportResponsible.lastName} ${meeting.reportResponsible.poste}`
      : '',
    new Date(meeting.startAt).toLocaleDateString('fr-FR'),
    new Date(meeting.startAt).toLocaleString('fr-FR'),
  ];

  return searchableValues.some((value) => normalizeText(value).includes(normalizedSearch));
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [updatingMeetingId, setUpdatingMeetingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchMeetings() {
      try {
        const data = await fetchJsonOrThrow<MeetingsResponse>('/api/meetings');
        setMeetings(
          (data.meetings || []).filter(
            (meeting: Meeting) => meeting.category !== 'OBJECTIF_HEBDOMADAIRE' && visibleCategories.has(meeting.category)
          )
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }
    fetchMeetings();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet événement ?')) return;
    try {
      await fetchJsonOrThrow(`/api/meetings/${id}`, { method: 'DELETE' });
      setMeetings(meetings.filter(m => m.id !== id));
      toast.success('Événement supprimé');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  const updateMeetingStatus = async (id: string, status: string) => {
    const previousMeetings = meetings;
    setUpdatingMeetingId(id);
    setMeetings((current) =>
      current.map((meeting) =>
        meeting.id === id ? { ...meeting, status } : meeting
      )
    );

    try {
      const data = await fetchJsonOrThrow<MeetingsResponse>(`/api/meetings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setMeetings((current) =>
        current.map((meeting) => (meeting.id === id ? (data.meeting || meeting) : meeting))
      );
      if (data.emailDelivery?.attempted && (data.emailDelivery.failed || 0) > 0) {
        toast.warning('Statut mis à jour, mais certaines notifications email ont échoué');
      } else {
        toast.success('Statut mis à jour');
      }
    } catch (error) {
      setMeetings(previousMeetings);
      toast.error(error instanceof Error ? error.message : 'Erreur');
    } finally {
      setUpdatingMeetingId(null);
    }
  };

  const yearOptions = Array.from(
    new Set(
      meetings.map((meeting) => String(new Date(meeting.startAt).getFullYear()))
    )
  ).sort((a, b) => Number(b) - Number(a));

  const filteredMeetings = meetings
    .slice()
    .sort(sortMostRecentFirst)
    .filter((meeting) => (activeTab === 'all' ? true : meeting.status === activeTab))
    .filter((meeting) => (categoryFilter === 'all' ? true : meeting.category === categoryFilter))
    .filter((meeting) => matchesSearch(meeting, search))
    .filter((meeting) => {
      if (monthFilter === 'all') return true;
      return new Date(meeting.startAt).getMonth() + 1 === Number(monthFilter);
    })
    .filter((meeting) => {
      if (yearFilter === 'all') return true;
      return new Date(meeting.startAt).getFullYear() === Number(yearFilter);
    });
  const totalPages = Math.max(1, Math.ceil(filteredMeetings.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMeetings = filteredMeetings.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );
  const paginationItems = buildPaginationItems(safePage, totalPages);

  const upcoming = meetings.filter(m => m.status === 'A_VENIR').length;
  const inProgress = meetings.filter(m => m.status === 'EN_COURS').length;
  const finished = meetings.filter(m => m.status === 'TERMINEE').length;
  const cancelled = meetings.filter(m => m.status === 'ANNULEE').length;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" />
            Événements
          </h1>
          <p className="text-sm text-muted-foreground">{meetings.length} événement(s)</p>
        </div>
        <Link href="/meetings/new">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-1" /> Nouvel événement
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div>
            <p className="text-sm font-medium">Filtrer les événements</p>
            <p className="text-xs text-muted-foreground">
              Les plus récents apparaissent en premier. {filteredMeetings.length} événement(s) trouvé(s).
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
                placeholder="Rechercher un événement"
              />
            </div>

            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="REUNION">Réunions</SelectItem>
                <SelectItem value="FORMATION">Formations</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={monthFilter}
              onValueChange={(value) => {
                setMonthFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un mois" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mois</SelectItem>
                {MONTH_OPTIONS.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={yearFilter}
              onValueChange={(value) => {
                setYearFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir une année" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les années</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Recherche par titre, description, responsable, type, statut ou date.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch('');
                setCategoryFilter('all');
                setMonthFilter('all');
                setYearFilter('all');
                setActiveTab('all');
                setCurrentPage(1);
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{upcoming}</p>
            <p className="text-xs text-muted-foreground">À venir</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{inProgress}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50/50 dark:bg-gray-950/20 dark:border-gray-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{finished}</p>
            <p className="text-xs text-muted-foreground">Terminées</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-rose-600">{cancelled}</p>
            <p className="text-xs text-muted-foreground">Annulées</p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setCurrentPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="A_VENIR">À venir</TabsTrigger>
          <TabsTrigger value="EN_COURS">En cours</TabsTrigger>
          <TabsTrigger value="TERMINEE">Terminées</TabsTrigger>
          <TabsTrigger value="ANNULEE">Annulées</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <p className="mt-4 text-muted-foreground">Aucun événement trouvé</p>
                <Link href="/meetings/new">
                  <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-1" /> Créer un événement
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {paginatedMeetings.map((meeting) => (
                <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/meetings/${meeting.id}`} className="font-semibold text-lg hover:text-emerald-600 transition-colors">
                            {meeting.title}
                          </Link>
                          <Badge className={statusColors[meeting.status] || 'bg-gray-100'}>
                            {statusLabels[meeting.status] || meeting.status}
                          </Badge>
                          <Badge variant="outline">{categoryLabels[meeting.category || 'REUNION'] || meeting.category}</Badge>
                          <Badge variant="outline">{typeLabels[meeting.type] || meeting.type}</Badge>
                        </div>
                        {meeting.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{meeting.description}</p>
                        )}
                        {meeting.reportResponsible && (
                          <p className="flex items-center gap-1 text-sm text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            Rapport du jour: {meeting.reportResponsible.firstName} {meeting.reportResponsible.lastName}
                            {(() => {
                              const pendingReports = meeting.reports?.filter(r => r.workflowStatus === 'en_attente') || [];
                              const correctionReports = meeting.reports?.filter(r => r.workflowStatus === 'a_corriger') || [];
                              return pendingReports.length > 0 ? (
                                <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold">
                                  {pendingReports.length} en attente
                                </span>
                              ) : correctionReports.length > 0 ? (
                                <span className="ml-1 inline-flex items-center rounded-full bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold">
                                  {correctionReports.length} à corriger
                                </span>
                              ) : meeting.reports && meeting.reports.length > 0 ? (
                                <span className="ml-1 inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                                  ✓ validé
                                </span>
                              ) : null;
                            })()}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(meeting.startAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {new Date(meeting.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {meeting.durationMins} min
                          </span>
                          {meeting.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {meeting.location}
                            </span>
                          )}
                          {meeting.platform && (
                            <span className="flex items-center gap-1">
                              <Video className="w-3.5 h-3.5" />
                              {meeting.platform}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {meeting.participants.length} participant(s)
                          </span>
                          {meeting.category === 'FORMATION' && (
                            <span className="flex items-center gap-1">
                              <Files className="w-3.5 h-3.5" />
                              {meeting.trainingDocuments?.length || 0} document(s)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {meeting.status === 'A_VENIR' && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={updatingMeetingId === meeting.id}
                            onClick={() => updateMeetingStatus(meeting.id, 'EN_COURS')}
                          >
                            <Play className="mr-1 h-4 w-4" /> Commencer
                          </Button>
                        )}
                        {meeting.status === 'EN_COURS' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingMeetingId === meeting.id}
                            onClick={() => updateMeetingStatus(meeting.id, 'TERMINEE')}
                          >
                            <Square className="mr-1 h-4 w-4" /> Terminer
                          </Button>
                        )}

                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/meetings/${meeting.id}`}>
                              <Eye className="w-4 h-4 mr-2" /> Voir les détails
                            </Link>
                          </DropdownMenuItem>
                          {(meeting.status === 'A_VENIR' || meeting.status === 'EN_COURS') && (
                            <DropdownMenuItem asChild>
                              <Link href={`/meetings/${meeting.id}/edit`}>
                                Modifier / reprogrammer
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {meeting.status === 'A_VENIR' && (
                            <DropdownMenuItem
                              disabled={updatingMeetingId === meeting.id}
                              onClick={() => updateMeetingStatus(meeting.id, 'EN_COURS')}
                            >
                              Démarrer
                            </DropdownMenuItem>
                          )}
                          {meeting.status === 'EN_COURS' && (
                            <DropdownMenuItem
                              disabled={updatingMeetingId === meeting.id}
                              onClick={() => updateMeetingStatus(meeting.id, 'TERMINEE')}
                            >
                              Terminer
                            </DropdownMenuItem>
                          )}
                          {(meeting.status === 'A_VENIR' || meeting.status === 'EN_COURS') && (
                            <DropdownMenuItem
                              className="text-destructive"
                              disabled={updatingMeetingId === meeting.id}
                              onClick={() => updateMeetingStatus(meeting.id, 'ANNULEE')}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Annuler
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {totalPages > 1 ? (
                <Card>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {safePage} sur {totalPages}
                    </p>

                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(event) => {
                              event.preventDefault();
                              if (safePage > 1) {
                                setCurrentPage(safePage - 1);
                              }
                            }}
                            className={safePage <= 1 ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>

                        {paginationItems.map((page, index) => {
                          const previousPage = paginationItems[index - 1];
                          const shouldShowEllipsis = previousPage && page - previousPage > 1;

                          return (
                            <div key={page} className="flex items-center">
                              {shouldShowEllipsis ? (
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              ) : null}
                              <PaginationItem>
                                <PaginationLink
                                  href="#"
                                  isActive={page === safePage}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    setCurrentPage(page);
                                  }}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            </div>
                          );
                        })}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(event) => {
                              event.preventDefault();
                              if (safePage < totalPages) {
                                setCurrentPage(safePage + 1);
                              }
                            }}
                            className={safePage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

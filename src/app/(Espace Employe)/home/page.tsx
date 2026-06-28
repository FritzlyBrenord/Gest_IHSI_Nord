'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, FileText, PenLine, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Meeting {
  id: string;
  category: string;
  title: string;
  startAt: string;
  status: string;
  trainingDocuments?: Array<{ id: string; key: string; url: string; name: string; mimeType: string; size: number }>;
  reports?: Array<{ id: string; title: string; workflowStatus: string; employer?: { firstName: string; lastName: string } }>;
  reportResponsible?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Document {
  id: string;
  title: string;
  type: string;
  variant: string;
  status: string;
  workflowStatus: string;
  createdAt: string;
}

interface TeamSummary {
  id: string;
  name: string;
  supervisor: {
    firstName: string;
    lastName: string;
    poste: string;
  };
}

function isUpcomingOrCurrent(meeting: Meeting) {
  if (meeting.status === 'ANNULEE' || meeting.status === 'TERMINEE') return false;
  if (meeting.status === 'EN_COURS') return true;
  return new Date(meeting.startAt).getTime() >= Date.now();
}

function pickNextEvent(meetings: Meeting[], currentUserId: string | null) {
  // First priority: events where user is report responsible and report is waiting for correction
  if (currentUserId) {
    const pendingReportEvents = meetings.filter(meeting =>
      meeting.reportResponsible?.id === currentUserId &&
      meeting.reports?.some(report => report.workflowStatus === 'en_attente')
    );
    if (pendingReportEvents.length > 0) {
      return pendingReportEvents[0];
    }

    // Second priority: any event where user is report responsible
    const responsibleEvents = meetings.filter(meeting =>
      meeting.reportResponsible?.id === currentUserId
    );
    if (responsibleEvents.length > 0) {
      return responsibleEvents[0];
    }
  }

  // Third priority: upcoming or current events
  const upcomingEvents = meetings.filter(isUpcomingOrCurrent);
  if (upcomingEvents.length > 0) {
    return upcomingEvents.sort((left, right) => {
      if (left.status === 'EN_COURS' && right.status !== 'EN_COURS') return -1;
      if (right.status === 'EN_COURS' && left.status !== 'EN_COURS') return 1;
      return new Date(left.startAt).getTime() - new Date(right.startAt).getTime();
    })[0];
  }

  // Fourth priority: pick a random event if no upcoming events
  if (meetings.length > 0) {
    const randomIndex = Math.floor(Math.random() * meetings.length);
    return meetings[randomIndex];
  }

  return null;
}

export default function ClientHomePage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/compte-employer/events').then((response) => response.json()),
      fetch('/api/compte-employer/teams').then((response) => response.json()),
      fetch('/api/documents').then((response) => response.json()),
      fetch('/api/auth/session').then((response) => response.json()),
    ])
      .then(([meetingsData, teamsData, documentsData, sessionData]) => {
        setMeetings(meetingsData.meetings || []);
        setTeams(teamsData.teams || []);
        setDocuments(documentsData.documents || []);
        setCurrentUserId(sessionData?.user?.employerId || null);
      })
      .catch(() => {
        setMeetings([]);
        setTeams([]);
        setDocuments([]);
        setCurrentUserId(null);
      });
  }, []);

  const formations = meetings.filter((meeting) => meeting.category === 'FORMATION');
  const reunions = meetings.filter((meeting) => meeting.category === 'REUNION');
  const trainingDocs = meetings.flatMap((meeting) => meeting.trainingDocuments || []);
  const nextEvent = pickNextEvent(meetings, currentUserId);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-4xl bg-linear-to-br from-[#003087] via-[#003d9e] to-[#00215d] p-6 text-white shadow-2xl shadow-blue-900/25 md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5" />
        <p className="relative text-sm font-semibold text-blue-100/80">Bienvenue</p>
        <h2 className="relative mt-2 text-2xl font-black leading-tight md:text-3xl">Votre espace IHSI</h2>
        <p className="relative mt-3 max-w-md text-sm leading-relaxed text-blue-100/70">Suivez vos réunions, formations, tâches, documents et présences depuis n'importe quel appareil.</p>
      </section>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard label="Formations" value={formations.length} icon={BookOpen} color="from-blue-500/10 to-blue-600/5" />
        <StatCard label="Réunions" value={reunions.length} icon={Users} color="from-indigo-500/10 to-indigo-600/5" />
        <StatCard label="Documents" value={documents.length} icon={FileText} color="from-sky-500/10 to-sky-600/5" />
        <StatCard label="Rapports" value={meetings.flatMap((meeting) => meeting.reports || []).length} icon={PenLine} color="from-emerald-500/10 to-emerald-600/5" />
      </div>

      {teams.length > 0 ? (
        <Card className="overflow-hidden border-0 bg-white/80 shadow-lg shadow-slate-200/50 backdrop-blur-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mes groupes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {teams.map((team) => (
                <span
                  key={team.id}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                >
                  {team.name}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Les taches rattachees a ces groupes remontent dans votre espace de suivi.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Next Event Card */}
      <Card className="overflow-hidden border-0 bg-white/80 shadow-lg shadow-slate-200/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Prochain événement</p>
              <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{nextEvent?.title || 'Aucun événement à venir'}</h3>
              {nextEvent ? <p className="mt-1 text-sm text-slate-500">{new Date(nextEvent.startAt).toLocaleString('fr-FR')}</p> : null}
            </div>
            <Button asChild className="shrink-0 rounded-xl bg-[#003087] text-sm font-semibold shadow-lg shadow-blue-900/20 transition-all hover:bg-[#00215d] hover:shadow-xl hover:shadow-blue-900/30">
              <Link href="/home">
                <PenLine className="mr-2 h-4 w-4" />
                Accueil
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <Card className="overflow-hidden border-0 bg-white/80 shadow-md shadow-slate-200/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50">
      <CardContent className="relative p-4">
        <div className={`absolute inset-0 bg-linear-to-br ${color} opacity-50`} />
        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003087]/10">
            <Icon className="h-5 w-5 text-[#003087]" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

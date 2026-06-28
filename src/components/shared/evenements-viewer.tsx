'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchJsonOrThrow } from '@/lib/fetch-json';
import { useAuth } from '@/hook/useAuth';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Files,
  MapPin,
  PenLine,
  RefreshCw,
  Search,
  Users,
  Video,
  X,
  CheckCircle2,
  Timer,
  CalendarClock,
  CalendarX2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventParticipant {
  id: string;
  wasPresent: boolean;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    poste: string;
    department: string;
  };
}

export interface TrainingDocument {
  id: string;
  name: string;
  url: string;
  size: number;
}

export interface MeetingEvent {
  id: string;
  category: 'REUNION' | 'FORMATION';
  title: string;
  description: string | null;
  trainer: string | null;
  startAt: string;
  durationMins: number;
  type: 'PRESENTIEL' | 'EN_LIGNE' | 'HYBRIDE';
  location: string | null;
  platform: string | null;
  meetingUrl: string | null;
  status: 'A_VENIR' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  reportResponsible: {
    id: string;
    firstName: string;
    lastName: string;
    poste: string;
    department: string;
  } | null;
  participants: EventParticipant[];
  trainingDocuments: TrainingDocument[];
  reports?: Array<{
    id: string;
    title: string;
    workflowStatus: string;
    visibility: string;
    createdAt: string;
    reviewComment: string | null;
    employer: { firstName: string; lastName: string };
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = () => new Date();

type VisualStatus = 'a_venir' | 'en_cours' | 'termine' | 'ecoule' | 'annule' | 'reprogramme';

function computeVisualStatus(meeting: MeetingEvent): VisualStatus {
  const start = new Date(meeting.startAt);
  const end = new Date(start.getTime() + meeting.durationMins * 60_000);

  if (meeting.status === 'ANNULEE') return 'annule';
  if (meeting.status === 'TERMINEE') return 'termine';

  const n = now();
  if (meeting.status === 'EN_COURS') return 'en_cours';

  // A_VENIR but start date is past
  if (meeting.status === 'A_VENIR' && end < n) return 'ecoule';

  // Was modified/rescheduled heuristic: status is A_VENIR but data updated
  return 'a_venir';
}

const VISUAL_STATUS_CONFIG: Record<
  VisualStatus,
  { label: string; color: string; dot: string; tab: string; icon: React.ElementType }
> = {
  a_venir:     { label: 'À venir',       color: 'bg-amber-100 text-amber-700 border-amber-200',         dot: 'bg-amber-500',   tab: 'a_venir',  icon: CalendarClock },
  en_cours:    { label: 'En cours',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',   dot: 'bg-emerald-500', tab: 'en_cours', icon: Timer },
  termine:     { label: 'Passé',         color: 'bg-slate-100 text-slate-600 border-slate-200',         dot: 'bg-slate-400',   tab: 'termine',  icon: CheckCircle2 },
  ecoule:      { label: 'Échu',          color: 'bg-rose-100 text-rose-700 border-rose-200',            dot: 'bg-rose-500',    tab: 'ecoule',   icon: CalendarX2 },
  annule:      { label: 'Annulé',        color: 'bg-gray-100 text-gray-500 border-gray-200',            dot: 'bg-gray-400',    tab: 'annule',   icon: X },
  reprogramme: { label: 'Reprogrammé',   color: 'bg-blue-100 text-blue-700 border-blue-200',            dot: 'bg-blue-500',    tab: 'a_venir',  icon: RefreshCw },
};

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  REUNION:   { label: 'Réunion',   bg: 'bg-violet-100', text: 'text-violet-700' },
  FORMATION: { label: 'Formation', bg: 'bg-teal-100',   text: 'text-teal-700'   },
};

const TYPE_LABELS: Record<string, string> = {
  PRESENTIEL: 'Présentiel',
  EN_LIGNE:   'En ligne',
  HYBRIDE:    'Hybride',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function normalizeSearch(val: string | null | undefined) {
  return String(val ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EvenementsViewerProps {
  /** If provided, only show events where this employeeId is participant or reportResponsible */
  filterByEmployeeId?: string;
  /** Base path for back navigation */
  backHref?: string;
  /** Allow write actions (compte rendu button, etc.) */
  allowActions?: boolean;
  /** Called when user clicks "Faire le compte rendu" */
  onCompteRendu?: (meeting: MeetingEvent) => void;
  /** Default category to filter by */
  defaultCategory?: 'tous' | 'REUNION' | 'FORMATION';
  /** Hide the category filter buttons */
  hideCategoryFilter?: boolean;
  /** Path to the doc viewer page for this role e.g. /executant/doc-viewer or /superviseur/doc-viewer */
  docViewerPath?: string;
  /** Current page path used as the 'back' param in the doc viewer URL */
  currentPath?: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EvenementsViewer({
  filterByEmployeeId,
  backHref,
  allowActions = false,
  onCompteRendu,
  defaultCategory = 'tous',
  hideCategoryFilter = false,
  docViewerPath = '/executant/doc-viewer',
  currentPath = '/evenements',
}: EvenementsViewerProps) {
  const [meetings, setMeetings] = useState<MeetingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MeetingEvent | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'tous' | VisualStatus>('tous');
  const [categoryFilter, setCategoryFilter] = useState<'tous' | 'REUNION' | 'FORMATION'>(defaultCategory);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchJsonOrThrow<{ meetings: MeetingEvent[] }>('/api/meetings')
      .then(({ meetings: data }) => {
        if (cancelled) return;
        const filtered = data.filter(
          m => m.category === 'REUNION' || m.category === 'FORMATION'
        );
        setMeetings(filtered);
      })
      .catch(e => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Erreur de chargement');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const enriched = useMemo(() => {
    return meetings
      .map(m => ({ ...m, visualStatus: computeVisualStatus(m) }))
      .filter(m => {
        if (!filterByEmployeeId) return true;
        const isParticipant = m.participants.some(p => p.employee.id === filterByEmployeeId);
        const isReporter = m.reportResponsible?.id === filterByEmployeeId;
        return isParticipant || isReporter;
      })
      .filter(m => {
        if (categoryFilter === 'tous') return true;
        return m.category === categoryFilter;
      })
      .filter(m => {
        if (activeTab === 'tous') return true;
        return m.visualStatus === activeTab;
      })
      .filter(m => {
        const q = normalizeSearch(search);
        if (!q) return true;
        return [m.title, m.description, m.location, m.platform,
          m.reportResponsible ? `${m.reportResponsible.firstName} ${m.reportResponsible.lastName}` : '',
          formatDate(m.startAt)]
          .some(val => normalizeSearch(val).includes(q));
      })
      .sort((a, b) => {
        // Sort: en_cours first, then a_venir, then others by date desc
        const order: Record<VisualStatus, number> = {
          en_cours: 0, a_venir: 1, ecoule: 2, termine: 3, reprogramme: 4, annule: 5,
        };
        const diff = order[a.visualStatus] - order[b.visualStatus];
        if (diff !== 0) return diff;
        return new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
      });
  }, [meetings, search, activeTab, categoryFilter, filterByEmployeeId]);

  // Tab counts
  const counts = useMemo(() => {
    const base = meetings
      .map(m => ({ ...m, visualStatus: computeVisualStatus(m) }))
      .filter(m => {
        if (!filterByEmployeeId) return true;
        return m.participants.some(p => p.employee.id === filterByEmployeeId) ||
          m.reportResponsible?.id === filterByEmployeeId;
      });
    return {
      tous:     base.length,
      a_venir:  base.filter(m => m.visualStatus === 'a_venir').length,
      en_cours: base.filter(m => m.visualStatus === 'en_cours').length,
      termine:  base.filter(m => m.visualStatus === 'termine').length,
      ecoule:   base.filter(m => m.visualStatus === 'ecoule').length,
      annule:   base.filter(m => m.visualStatus === 'annule').length,
      reprogramme: 0,
    };
  }, [meetings, filterByEmployeeId]);

  // If a detail view is open
  if (selected) {
    return (
      <EventDetail
        meeting={selected}
        filterByEmployeeId={filterByEmployeeId}
        allowActions={allowActions}
        onCompteRendu={onCompteRendu}
        onBack={() => setSelected(null)}
        docViewerPath={docViewerPath}
        currentPath={currentPath}
      />
    );
  }

  const TABS: { id: 'tous' | VisualStatus; label: string; count: number }[] = [
    { id: 'tous',     label: 'Tous',        count: counts.tous },
    { id: 'en_cours', label: 'En cours',    count: counts.en_cours },
    { id: 'a_venir',  label: 'À venir',     count: counts.a_venir },
    { id: 'termine',  label: 'Passés',      count: counts.termine },
    { id: 'ecoule',   label: 'Échus',       count: counts.ecoule },
    { id: 'annule',   label: 'Annulés',     count: counts.annule },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              {backHref && (
                <a href={backHref} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </a>
              )}
              <h1 className="text-2xl font-bold text-slate-950">
                {hideCategoryFilter ? (defaultCategory === 'FORMATION' ? 'Formations' : 'Réunions') : 'Événements'}
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {counts.tous} {hideCategoryFilter ? (defaultCategory === 'FORMATION' ? 'formation' : 'réunion') : 'événement'}{counts.tous !== 1 ? 's' : ''} {!hideCategoryFilter && '• Réunions & Formations'}
            </p>
          </div>
          {/* Stats strip */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'En cours', value: counts.en_cours, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
              { label: 'À venir',  value: counts.a_venir,  color: 'text-amber-700 bg-amber-50 border-amber-200' },
              { label: 'Échus',    value: counts.ecoule,   color: 'text-rose-700 bg-rose-50 border-rose-200' },
            ].map(s => (
              <div key={s.label} className={`flex flex-col items-center rounded-xl border px-4 py-2 ${s.color}`}>
                <span className="text-xl font-bold leading-none">{s.value}</span>
                <span className="text-xs font-medium mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un événement…"
            className="pl-9 rounded-xl border-slate-200"
          />
        </div>
        {!hideCategoryFilter && (
          <div className="flex gap-2">
            {(['tous', 'REUNION', 'FORMATION'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                  categoryFilter === cat
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
                }`}
              >
                {cat === 'tous' ? 'Tous' : cat === 'REUNION' ? 'Réunions' : 'Formations'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(tab => {
          const config = tab.id === 'tous' ? null : VISUAL_STATUS_CONFIG[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {config && <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-white' : config.dot}`} />}
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : enriched.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Calendar className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">Aucun événement trouvé</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {enriched.map(meeting => (
            <EventCard
              key={meeting.id}
              meeting={meeting}
              visualStatus={meeting.visualStatus}
              filterByEmployeeId={filterByEmployeeId}
              allowActions={allowActions}
              onCompteRendu={onCompteRendu}
              onClick={() => setSelected(meeting)}
              docViewerPath={docViewerPath}
              currentPath={currentPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

interface CardProps {
  meeting: MeetingEvent & { visualStatus: VisualStatus };
  visualStatus: VisualStatus;
  filterByEmployeeId?: string;
  allowActions?: boolean;
  onCompteRendu?: (m: MeetingEvent) => void;
  onClick: () => void;
  docViewerPath?: string;
  currentPath?: string;
}

function EventCard({ meeting, visualStatus, filterByEmployeeId, allowActions, onCompteRendu, onClick, docViewerPath = '/executant/doc-viewer', currentPath = '/evenements' }: CardProps) {
  const cfg = VISUAL_STATUS_CONFIG[visualStatus];
  const catCfg = CATEGORY_CONFIG[meeting.category];
  const Icon = cfg.icon;

  const isReporter = filterByEmployeeId && meeting.reportResponsible?.id === filterByEmployeeId;
  const myReport = isReporter && meeting.reports && meeting.reports.length > 0 ? meeting.reports[0] : null;
  const isReportValid = myReport?.workflowStatus === 'valide';
  
  const canCompteRendu = allowActions && isReporter && (meeting.status === 'EN_COURS' || meeting.status === 'TERMINEE');

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
      onClick={onClick}
    >
      {/* Accent bar */}
      <div className={`absolute left-0 top-0 h-full w-1 ${cfg.dot}`} />

      <div className="flex flex-col gap-4 p-5 pl-6 sm:flex-row sm:items-center">
        {/* Date block */}
        <div className="shrink-0 text-center">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 w-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {new Date(meeting.startAt).toLocaleDateString('fr-FR', { month: 'short' })}
            </p>
            <p className="text-2xl font-bold text-slate-900 leading-none mt-0.5">
              {new Date(meeting.startAt).getDate()}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(meeting.startAt).getFullYear()}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
              <Icon className="h-3 w-3" />
              {cfg.label}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${catCfg.bg} ${catCfg.text}`}>
              {catCfg.label}
            </span>
            {isReporter && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                <FileText className="h-3 w-3 inline mr-1" />
                Responsable rapport
              </span>
            )}
          </div>

          <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
            {meeting.title}
          </h3>

          {meeting.description && (
            <p className="mt-0.5 text-sm text-slate-500 line-clamp-1">{meeting.description}</p>
          )}

          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatShortDate(meeting.startAt)} à {formatTime(meeting.startAt)}
            </span>
            <span className="flex items-center gap-1">
              <Timer className="h-3.5 w-3.5" />
              {meeting.durationMins} min
            </span>
            {meeting.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {meeting.location}
              </span>
            )}
            {meeting.platform && (
              <span className="flex items-center gap-1">
                <Video className="h-3.5 w-3.5" />
                {meeting.platform}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
            </span>
            {meeting.category === 'FORMATION' && meeting.trainingDocuments.length > 0 && (
              <span className="flex items-center gap-1">
                <Files className="h-3.5 w-3.5" />
                {meeting.trainingDocuments.length} doc{meeting.trainingDocuments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-2" onClick={e => e.stopPropagation()}>
          {canCompteRendu && (
            <Button
              size="sm"
              className={`rounded-xl shadow-sm text-xs ${isReportValid ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              onClick={() => { if (!isReportValid) onCompteRendu?.(meeting) }}
              disabled={isReportValid}
            >
              <PenLine className="h-3.5 w-3.5 mr-1.5" />
              {isReportValid ? 'Compte rendu validé' : (myReport ? 'Modifier le compte rendu' : 'Faire le compte rendu')}
            </Button>
          )}
          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-600 transition-colors" />
        </div>
      </div>

      {/* Échu warning */}
      {visualStatus === 'ecoule' && (
        <div className="flex items-center gap-2 border-t border-rose-100 bg-rose-50 px-6 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          <p className="text-xs text-rose-700">
            La date prévue est dépassée et l'événement n'a pas été mis à jour.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Event Detail ─────────────────────────────────────────────────────────────

interface DetailProps {
  meeting: MeetingEvent;
  filterByEmployeeId?: string;
  allowActions?: boolean;
  onCompteRendu?: (m: MeetingEvent) => void;
  onBack: () => void;
  docViewerPath?: string;
  currentPath?: string;
}

function EventDetail({ meeting, filterByEmployeeId, allowActions, onCompteRendu, onBack, docViewerPath = '/executant/doc-viewer', currentPath = '/evenements' }: DetailProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'participants' | 'documents' | 'reports'>('info');
  const visualStatus = computeVisualStatus(meeting);
  const cfg = VISUAL_STATUS_CONFIG[visualStatus];
  const catCfg = CATEGORY_CONFIG[meeting.category];
  const StatusIcon = cfg.icon;

  const isReporter = filterByEmployeeId && meeting.reportResponsible?.id === filterByEmployeeId;
  const myReport = isReporter && meeting.reports && meeting.reports.length > 0 ? meeting.reports[0] : null;
  const isReportValid = myReport?.workflowStatus === 'valide';
  
  const canCompteRendu = allowActions && isReporter && (meeting.status === 'EN_COURS' || meeting.status === 'TERMINEE');
  const isFormation = meeting.category === 'FORMATION';
  const startObj = new Date(meeting.startAt);

  const visibleReports = meeting.reports?.filter(r => isReporter || r.visibility === 'public') || [];

  const DETAIL_TABS = [
    { id: 'info' as const, label: 'Informations' },
    { id: 'participants' as const, label: `Participants (${meeting.participants.length})` },
    ...(isFormation ? [{ id: 'documents' as const, label: `Documents (${meeting.trainingDocuments.length})` }] : []),
    ...(visibleReports.length > 0 ? [{ id: 'reports' as const, label: `Rapports (${visibleReports.length})` }] : []),
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux événements
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.color}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {cfg.label}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${catCfg.bg} ${catCfg.text}`}>
                {catCfg.label}
              </span>
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                {TYPE_LABELS[meeting.type] || meeting.type}
              </span>
              {isReporter && (
                <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Vous êtes responsable du rapport
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-950">{meeting.title}</h2>
            {meeting.description && (
              <p className="mt-1 text-sm text-slate-500 max-w-2xl">{meeting.description}</p>
            )}
          </div>

          {canCompteRendu && (
            <Button
              className={`rounded-xl shadow-sm shrink-0 ${isReportValid ? 'bg-slate-100 text-slate-500 cursor-not-allowed hover:bg-slate-100 border' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              onClick={() => { if (!isReportValid) onCompteRendu?.(meeting) }}
              disabled={isReportValid}
            >
              <PenLine className="h-4 w-4 mr-2" />
              {isReportValid ? 'Compte rendu validé' : (myReport ? 'Modifier le compte rendu' : 'Faire le compte rendu')}
            </Button>
          )}
        </div>

        {/* Échu warning */}
        {visualStatus === 'ecoule' && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-800">Événement échu</p>
              <p className="text-xs text-rose-700 mt-0.5">
                La date prévue est déjà passée et le statut n'a pas été mis à jour. Veuillez contacter l'administrateur pour reprogrammer ou clôturer cet événement.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {DETAIL_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Date & Heure */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Date &amp; Heure</h3>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 capitalize">{formatDate(meeting.startAt)}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatTime(meeting.startAt)} • {meeting.durationMins} minutes
                </p>
              </div>
            </div>
          </div>

          {/* Lieu */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Lieu / Plateforme</h3>
            {meeting.location && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <MapPin className="h-4 w-4 text-slate-500" />
                </div>
                <p className="text-sm text-slate-700">{meeting.location}</p>
              </div>
            )}
            {meeting.platform && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <Video className="h-4 w-4 text-slate-500" />
                </div>
                <p className="text-sm text-slate-700">{meeting.platform}</p>
              </div>
            )}
            {meeting.meetingUrl && (
              <a
                href={meeting.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{meeting.meetingUrl}</span>
              </a>
            )}
            {!meeting.location && !meeting.platform && !meeting.meetingUrl && (
              <p className="text-sm text-slate-400 italic">Non précisé</p>
            )}
          </div>

          {/* Formateur */}
          {isFormation && meeting.trainer && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Formateur</h3>
              <p className="text-sm font-medium text-slate-800">{meeting.trainer}</p>
            </div>
          )}

          {/* Responsable rapport */}
          {meeting.reportResponsible && (
            <div className={`rounded-2xl border p-5 ${
              isReporter
                ? 'border-blue-200 bg-blue-50'
                : 'border-slate-200 bg-white'
            }`}>
              <h3 className={`text-xs font-semibold uppercase tracking-widest mb-3 ${
                isReporter ? 'text-blue-500' : 'text-slate-400'
              }`}>Responsable du rapport</h3>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm ${
                  isReporter ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {getInitials(meeting.reportResponsible.firstName, meeting.reportResponsible.lastName)}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isReporter ? 'text-blue-900' : 'text-slate-900'}`}>
                    {meeting.reportResponsible.firstName} {meeting.reportResponsible.lastName}
                    {isReporter && <span className="ml-2 text-xs font-normal text-blue-600">(vous)</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {meeting.reportResponsible.poste} • {meeting.reportResponsible.department}
                  </p>
                </div>
              </div>
              {isReporter && canCompteRendu && (
                <Button
                  size="sm"
                  className={`mt-4 w-full rounded-xl ${isReportValid ? 'bg-slate-100 text-slate-500 cursor-not-allowed border' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  onClick={() => { if (!isReportValid) onCompteRendu?.(meeting) }}
                  disabled={isReportValid}
                >
                  <PenLine className="h-4 w-4 mr-2" />
                  {isReportValid ? 'Compte rendu validé' : (myReport ? 'Modifier le compte rendu' : 'Rédiger le compte rendu')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
            </h3>
            {meeting.status === 'TERMINEE' && (
              <Badge variant="secondary" className="text-xs">
                {meeting.participants.filter(p => p.wasPresent).length} présent{meeting.participants.filter(p => p.wasPresent).length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {meeting.participants.map(p => (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  p.wasPresent && meeting.status === 'TERMINEE'
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white font-semibold text-xs text-slate-700 shadow-sm border border-slate-200">
                  {getInitials(p.employee.firstName, p.employee.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {p.employee.firstName} {p.employee.lastName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{p.employee.poste}</p>
                </div>
                {meeting.status === 'TERMINEE' && p.wasPresent && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'documents' && isFormation && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Documents de formation
          </h3>
          {meeting.trainingDocuments.length === 0 ? (
            <div className="py-10 text-center">
              <Files className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">Aucun document attaché</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {meeting.trainingDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm">
                    <FileText className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatFileSize(doc.size)}</p>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5">
                      <Download className="h-3.5 w-3.5" />
                      Télécharger
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Rapports de l'événement
          </h3>
          <div className="grid gap-3">
            {visibleReports.map(report => (
              <div
                key={report.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                    <p className="text-sm font-semibold text-slate-900 truncate" title={report.title}>
                      {report.title}
                    </p>
                  </div>
                  <Badge variant={report.workflowStatus === 'valide' ? 'default' : report.workflowStatus === 'a_corriger' ? 'destructive' : 'secondary'} className="text-[10px] flex-shrink-0">
                    {report.workflowStatus === 'valide' ? 'Validé' : report.workflowStatus === 'a_corriger' ? 'À corriger' : 'En attente'}
                  </Badge>
                </div>

                {/* Note de correction */}
                {report.reviewComment && report.workflowStatus === 'a_corriger' && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <p className="text-xs font-semibold text-rose-700 mb-1 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Note de correction de l'administrateur
                    </p>
                    <p className="text-sm text-rose-900">{report.reviewComment}</p>
                  </div>
                )}

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Par {report.employer.firstName} {report.employer.lastName}</span>
                    <span>•</span>
                    <span>{new Date(report.createdAt).toLocaleDateString('fr-FR')}</span>
                    {report.visibility === 'public' && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-[10px] uppercase h-4 px-1 py-0 border-slate-300">Public</Badge>
                      </>
                    )}
                  </div>
                  <a
                    href={`${docViewerPath}?docId=${report.id}&back=${currentPath}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Lire le document
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Default export: hook for consuming component ─────────────────────────────

export function useCurrentUserEmployerId() {
  const { user } = useAuth();
  return user?.employerId as string | undefined;
}

'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchJsonOrThrow } from '@/lib/fetch-json';
import { useAuth } from '@/hook/useAuth';
import {
  mockEvenementsResponsable,
  mockRapports,
  mockStatsSnapshots,
  mockSuperviseur,
  mockTachesEquipe,
  mockTachesRecues,
  type MockSupervisorFormation,
  type MockSupervisorIncomingTask,
  type MockSupervisorMember,
  type MockSupervisorMemberTask,
  type MockSupervisorReport,
  type MockSupervisorStatsSnapshot,
  type SupervisorMemberStatus,
  type SupervisorReportStatus,
  type SupervisorTaskPriority,
  type SupervisorTaskStatus,
} from '@/lib/mock-superviseur';

type NewTeamTaskInput = {
  membreId: string;
  titre: string;
  description: string;
  priorite: SupervisorTaskPriority;
  dateDebut: string;
  dateFin: string;
};

type NewReportInput = {
  type: 'Formation' | 'Reunion';
  evenementId: string;
  dateEvenement: string;
  participantsIds: string[];
  contenu: string;
};

type SupervisorProfile = typeof mockSuperviseur;

const EMPTY_SUPERVISEUR: SupervisorProfile = {
  ...mockSuperviseur,
  id: '',
  nom: '',
  prenom: '',
  email: '',
  poste: '',
};

type SupervisorTeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  poste: string;
  department: string;
  isActive: boolean;
  deletedAt: string | null;
  prenom?: string;
  nom?: string;
  statut?: 'actif' | 'inactif';
};

type SupervisorTeam = {
  id: string;
  name: string;
  supervisor: SupervisorTeamMember;
  members: SupervisorTeamMember[];
};

type SupervisorTeamsResponse = {
  supervisor: {
    id: string;
    employeeId: string | null;
    email: string;
    firstName: string;
    lastName: string;
    poste: string;
    department: string;
  };
  teams: SupervisorTeam[];
};

type ClientMeResponse = {
  client?: {
    id?: string;
    email?: string;
    employeeId?: string | null;
    employee?: {
      firstName?: string | null;
      lastName?: string | null;
      poste?: string | null;
      department?: string | null;
    } | null;
  };
};

type ClientMeeting = {
  id: string;
  category: 'REUNION' | 'FORMATION' | 'ENQUETE' | 'OBJECTIF_HEBDOMADAIRE' | string;
  title: string;
  startAt: string;
  durationMins: number;
  type: 'PRESENTIEL' | 'EN_LIGNE' | 'HYBRIDE' | string;
  location?: string | null;
  platform?: string | null;
  status?: string;
  trainer?: string | null;
  reportResponsible?: {
    firstName: string;
    lastName: string;
  } | null;
};

type ClientEventsResponse = {
  meetings: ClientMeeting[];
};

type ClientObjectivesResponse = {
  objectives: Array<{
    id: string;
    title: string;
    startAt: string;
    objectivePlans: Array<{
      id: string;
      plan: string;
      objectives: Array<{
        id: string;
        title: string;
        status: string;
        progressNote: string | null;
        isEvaluated?: boolean;
        targetGroupId?: string | null;
        targetDepartment?: string | null;
        responsibleEmployeeId?: string | null;
      }>;
    }>;
  }>;
};

type SupervisorObjectivesResponse = {
  objectives: Array<{
    id: string;
    title: string;
    startAt: string;
    objectivePlans: Array<{
      id: string;
      plan: string;
      objectives: Array<{
        id: string;
        title: string;
        status: string;
        progressNote: string | null;
        isEvaluated?: boolean;
        targetGroupId?: string | null;
        targetGroupName?: string | null;
        targetDepartment?: string | null;
        responsibleEmployeeId?: string | null;
      }>;
    }>;
  }>;
};

type SupervisorObjectiveReportsResponse = {
  reports: SupervisorObjectiveReport[];
};

type TeamTaskApiRecord = {
  id: string;
  teamId: string;
  teamName?: string;
  assignedEmployeeId: string;
  createdByManagedUserId: string;
  title: string;
  description: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  priority: 'haute' | 'normale' | 'basse';
  status: 'a_faire' | 'en_cours' | 'termine' | 'en_retard';
  employeeNote: string | null;
  employeeStatusNotes?: Array<{ status: 'a_faire' | 'en_cours' | 'termine' | 'en_retard'; note: string | null; createdAt: string }>;
  supervisorNote: string | null;
  supervisorNotes?: Array<{ note: string | null; createdAt: string }>;
  employeeUpdatedAt: string | null;
  supervisorReviewedAt: string | null;
  validatedAt: string | null;
  isValidated: boolean;
  createdAt: string;
  updatedAt: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    poste: string;
    department: string;
    isActive: boolean;
  } | null;
};

type TeamTasksResponse = {
  teams: Array<{ id: string; name: string }>;
  tasks: TeamTaskApiRecord[];
};

type SupervisorObjectiveReport = {
  id: string;
  meetingId: string;
  meetingTitle?: string;
  meetingDate?: string;
  objectiveId: string;
  objectiveTitle?: string;
  planLabel?: string;
  status: string;
  note: string | null;
  generatedContent?: string;
  employeeId?: string;
  employeeName?: string;
  employeeDepartment?: string;
  targetGroupId: string | null;
  targetGroupName: string | null;
  updatedAt: string;
};

type SupervisorObjectiveTask = {
  id: string;
  objectiveId: string;
  planId?: string;
  taskId?: string;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  planLabel: string;
  title: string;
  status: string;
  progressNote: string;
  isEvaluated: boolean;
  dateDebut: string | null;
  dateFin: string | null;
  targetGroupId: string | null;
  targetGroupName: string | null;
  targetDepartment: string | null;
  responsibleEmployeeId: string | null;
};

type SupervisorDemoContextValue = {
  superviseur: SupervisorProfile;
  teams: SupervisorTeam[];
  members: MockSupervisorMember[];
  incomingTasks: MockSupervisorIncomingTask[];
  memberTasks: MockSupervisorMemberTask[];
  formations: MockSupervisorFormation[];
  reports: MockSupervisorReport[];
  events: Array<{
    id: string;
    type: 'Formation' | 'Reunion';
    titre: string;
    date: string;
    responsable: string;
    lieu?: string;
  }>;
  objectiveTasks: SupervisorObjectiveTask[];
  objectiveReports: SupervisorObjectiveReport[];
  statsSnapshots: MockSupervisorStatsSnapshot[];
  signatureDataUrl: string | null;
  toggleMemberStatus: (id: string) => void;
  createMemberTask: (input: NewTeamTaskInput) => Promise<void>;
  updateIncomingTaskStatus: (id: string, status: SupervisorTaskStatus) => void;
  updateIncomingTaskNotes: (id: string, notes: string) => void;
  updateIncomingTaskReport: (id: string, report: string) => void;
  updateMemberTaskStatus: (id: string, status: SupervisorTaskStatus, notes?: string) => void;
  updateMemberTaskNotes: (id: string, notes: string) => Promise<void>;
    validateMemberTaskResult: (id: string, notes?: string) => void;
  validateReport: (id: string) => void;
  requestReportCorrection: (id: string, motif: string) => void;
  authorizeDirectorAccess: (id: string) => void;
  createReport: (input: NewReportInput) => void;
  addObjectiveReport: (report: SupervisorObjectiveReport) => void;
  setSignature: (dataUrl: string | null) => void;
};

const INCOMING_TASKS_KEY = 'superviseur-demo-incoming-tasks';
const MEMBER_TASKS_KEY = 'superviseur-demo-member-tasks';
const REPORTS_KEY = 'superviseur-demo-reports';
const SIGNATURE_KEY = 'superviseur-demo-signature';

const SupervisorDemoContext = createContext<SupervisorDemoContextValue | null>(null);

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function isLocked(status: SupervisorTaskStatus) {
  return status === 'termine';
}

function mapTeamMember(member: SupervisorTeamMember): MockSupervisorMember {
  return {
    id: member.id,
    nom: member.lastName,
    prenom: member.firstName,
    poste: member.poste,
    statut: member.isActive && !member.deletedAt ? 'actif' : 'inactif',
    email: member.email,
  };
}

function mapMeetingToEvent(meeting: ClientMeeting, fallbackResponsible: string): {
  id: string;
  type: 'Formation' | 'Reunion';
  titre: string;
  date: string;
  responsable: string;
  lieu?: string;
} {
  return {
    id: meeting.id,
    type: meeting.category === 'FORMATION' ? 'Formation' : 'Reunion',
    titre: meeting.title,
    date: meeting.startAt.slice(0, 10),
    responsable: meeting.reportResponsible
      ? `${meeting.reportResponsible.firstName} ${meeting.reportResponsible.lastName}`
      : fallbackResponsible,
    lieu: meeting.location || meeting.platform || undefined,
  };
}

function flattenTeams(teams: SupervisorTeam[]) {
  const byId = new Map<string, MockSupervisorMember>();
  for (const team of teams) {
    for (const member of team.members) {
      byId.set(member.id, mapTeamMember(member));
    }
  }
  return Array.from(byId.values());
}

function mapTeamTaskToMemberTask(task: TeamTaskApiRecord): MockSupervisorMemberTask {
  const employeeStatusNotes = task.employeeStatusNotes || [];
  const supervisorNotes = task.supervisorNotes || (task.supervisorNote ? [{ note: task.supervisorNote, createdAt: task.updatedAt }] : []);
  const rapportEmploye = employeeStatusNotes.length > 0
    ? employeeStatusNotes
        .map((entry) => `${entry.status} - ${entry.note?.trim() || 'Aucune note'}`)
        .join(' | ')
    : task.employeeNote || 'Aucun rapport soumis pour le moment.';

  return {
    id: task.id,
    membreId: task.assignedEmployeeId,
    titre: task.title,
    description: task.description || '',
    statut: task.status,
    priorite: task.priority,
    dateDebut: task.dateDebut || task.createdAt.slice(0, 10),
    dateFin: task.dateFin || task.updatedAt.slice(0, 10),
    notesSuperviseur: task.supervisorNote || '',
    supervisorNotes,
    rapportEmploye,
    employeeStatusNotes,
    resultatValide: task.isValidated,
    validatedAt: task.validatedAt,
    evaluation: null,
    appreciation: task.isValidated ? 'Validee par le superviseur' : '',
    satisfaction: task.isValidated ? 100 : 0,
    creeLe: task.createdAt.slice(0, 10),
    createdAt: task.createdAt,
  };
}

function filterIncomingTasksForTeams(
  tasks: MockSupervisorIncomingTask[],
  teams: SupervisorTeam[]
) {
  const teamIds = new Set(teams.map((team) => team.id));
  return tasks.filter((task) => teamIds.has((task as { teamId?: string }).teamId || ''));
}

function findTeamForMember(teams: SupervisorTeam[], memberId: string) {
  return teams.find((team) => team.members.some((member) => member.id === memberId)) || null;
}

function flattenObjectiveTasks(
  objectives: any[],
  teams: SupervisorTeam[]
): SupervisorObjectiveTask[] {
  const teamNames = new Map(teams.map((team) => [team.id, team.name]));
  const teamIds = new Set(teams.map((team) => team.id));

  return objectives.flatMap((objectiveObj) => {
    const plans = Array.isArray(objectiveObj.plans) ? objectiveObj.plans : [];
    
    return plans.flatMap((plan: any) => {
      const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
      return tasks
        .filter((task: any) => task.responsibleType === 'equipe' && teamIds.has(task.teamId))
        .map((task: any) => ({
          id: `${objectiveObj.id}:${plan.id}:${task.id}`,
          objectiveId: objectiveObj.id,
          planId: plan.id,
          taskId: task.id,
          meetingId: objectiveObj.id, // Keep meetingId for UI compatibility
          meetingTitle: objectiveObj.title, // Title of the overall objective
          meetingDate: new Date(objectiveObj.startDate).toISOString().slice(0, 10),
          planLabel: plan.name || 'Plan sans nom',
          title: task.title,
          status: task.status || 'a_faire',
          progressNote: task.evaluationNote || '',
          isEvaluated: task.hasBeenEvaluated || objectiveObj.isEvaluated || false,
          dateDebut: new Date(objectiveObj.startDate).toISOString().slice(0, 10),
          dateFin: new Date(objectiveObj.endDate).toISOString().slice(0, 10),
          targetGroupId: task.teamId,
          targetGroupName: teamNames.get(task.teamId) || task.teamId,
          targetDepartment: task.department || null,
          responsibleEmployeeId: task.personId || null,
        }));
    });
  });
}

export function SuperviseurProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [superviseur, setSuperviseur] = useState<SupervisorProfile>(EMPTY_SUPERVISEUR);
  const [teams, setTeams] = useState<SupervisorTeam[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; type: 'Formation' | 'Reunion'; titre: string; date: string; responsable: string; lieu?: string }>>(mockEvenementsResponsable);
  const [objectiveTasks, setObjectiveTasks] = useState<SupervisorObjectiveTask[]>([]);
  const [objectiveReports, setObjectiveReports] = useState<SupervisorObjectiveReport[]>([]);
  const [incomingTasks, setIncomingTasks] = useState<MockSupervisorIncomingTask[]>(() =>
    safeRead(INCOMING_TASKS_KEY, mockTachesRecues)
  );
  const [memberTasks, setMemberTasks] = useState<MockSupervisorMemberTask[]>(() =>
    safeRead(MEMBER_TASKS_KEY, mockTachesEquipe)
  );
  const [reports, setReports] = useState<MockSupervisorReport[]>(() => safeRead(REPORTS_KEY, mockRapports));
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(() =>
    safeRead<string | null>(SIGNATURE_KEY, null)
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSupervisorData() {
      try {
        const [
          eventsResult,
          objectivesResult,
          teamResult,
          teamTasksResult,
          incomingTasksResult,
          objectiveReportsResult,
        ] = await Promise.allSettled([
          fetchJsonOrThrow<ClientEventsResponse>('/api/meetings'),
          fetchJsonOrThrow<any>('/api/objectives'),
          fetchJsonOrThrow<SupervisorTeamsResponse>('/api/superviseur/teams'),
          fetchJsonOrThrow<TeamTasksResponse>('/api/superviseur/team-tasks'),
          fetchJsonOrThrow<{ tasks: any[] }>('/api/superviseur/incoming-tasks'),
          fetchJsonOrThrow<{ reports: SupervisorObjectiveReport[] }>('/api/superviseur/objective-reports'),
        ]);

        if (cancelled) return;

        const me = { client: user ? { employeeId: user.employerId, email: user.email, employee: { firstName: user.name?.split(' ')[0] || '', lastName: user.name?.split(' ').slice(1).join(' ') || '', poste: user.role } } : null };
        const eventsResponse = eventsResult.status === 'fulfilled' ? eventsResult.value : { meetings: [] };
        const objectivesResponse = objectivesResult.status === 'fulfilled' ? objectivesResult.value : { objectives: [] };
        const teamResponse = teamResult.status === 'fulfilled' ? teamResult.value : { supervisor: null, teams: [] };
        const teamTasksResponse = teamTasksResult.status === 'fulfilled' ? teamTasksResult.value : { teams: [], tasks: [] };
        const incomingTasksResponse = incomingTasksResult.status === 'fulfilled' ? incomingTasksResult.value : { tasks: [] };
        const objectiveReportsResponse = objectiveReportsResult.status === 'fulfilled' ? objectiveReportsResult.value : { reports: [] };

        const client = me.client;
        const employee = client?.employee;
        const supervisor = teamResponse.supervisor;

        if (supervisor) {
          setSuperviseur((current) => ({
            ...current,
            id: supervisor.id || (client as any)?.employeeId || (client as any)?.id || current.id,
            nom: supervisor.lastName || employee?.lastName || current.nom,
            prenom: supervisor.firstName || employee?.firstName || current.prenom,
            email: supervisor.email || client?.email || current.email,
            poste: supervisor.poste || employee?.poste || current.poste,
          }));
        } else if (client && employee) {
          setSuperviseur((current) => ({
            ...current,
            id: (client as any)?.employeeId || (client as any)?.id || current.id,
            nom: employee.lastName || current.nom,
            prenom: employee.firstName || current.prenom,
            email: client.email || current.email,
            poste: employee.poste || current.poste,
          }));
        }

        setTeams(teamResponse.teams || []);
        
        // Map incoming tasks from API to mock format
        const mappedIncomingTasks = incomingTasksResponse.tasks.map((task: any) => ({
          id: task.id,
          titre: task.titre,
          description: task.description || '',
          source: task.source,
          statut: task.statut,
          priorite: task.priorite,
          dateDebut: task.dateDebut,
          dateFin: task.dateFin,
          notesSuperviseur: '',
          rapportSuperviseur: '',
          teamId: task.teamId,
          objectiveId: task.objectiveId,
        }));
        setIncomingTasks(mappedIncomingTasks);
        
        setMemberTasks((teamTasksResponse.tasks || []).map(mapTeamTaskToMemberTask));
        const fallbackName = supervisor
          ? `${supervisor.firstName || ''} ${supervisor.lastName || ''}`.trim()
          : employee
            ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
            : `${mockSuperviseur.prenom} ${mockSuperviseur.nom}`.trim();
        const meetings = eventsResponse.meetings || [];
        const visibleMeetings = meetings.filter((meeting) => meeting.category === 'REUNION' || meeting.category === 'FORMATION');

        setEvents(visibleMeetings.map((meeting) => mapMeetingToEvent(meeting, fallbackName)));
        const objectiveTasksData = flattenObjectiveTasks(objectivesResponse.objectives || [], teamResponse.teams || []);
        setObjectiveTasks(objectiveTasksData);
        setObjectiveReports(objectiveReportsResponse.reports);
      } catch (error) {
        console.error('[superviseur-provider] load failed', error);
      }
    }

    if (user) {
      loadSupervisorData();
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    window.localStorage.setItem(INCOMING_TASKS_KEY, JSON.stringify(incomingTasks));
  }, [incomingTasks]);

  useEffect(() => {
    window.localStorage.setItem(MEMBER_TASKS_KEY, JSON.stringify(memberTasks));
  }, [memberTasks]);

  useEffect(() => {
    window.localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    window.localStorage.setItem(SIGNATURE_KEY, JSON.stringify(signatureDataUrl));
  }, [signatureDataUrl]);

  const members = useMemo(() => flattenTeams(teams), [teams]);
  const formations = useMemo(
    () => events.filter((event) => event.type === 'Formation').map((event) => {
      const statut: MockSupervisorFormation['statut'] = new Date(event.date).getTime() < Date.now() ? 'passee' : 'prevue';
      const mode: MockSupervisorFormation['mode'] = event.lieu?.toLowerCase().includes('en ligne') ? 'En ligne' : 'Presentiel';
      return {
        id: event.id,
        titre: event.titre,
        date: event.date,
        statut,
        superviseur: event.responsable,
        lieu: event.lieu || 'A confirmer',
        duree: '--',
        mode,
      };
    }),
    [events]
  );

  const value = useMemo<SupervisorDemoContextValue>(
    () => ({
      superviseur,
      teams,
      members,
      incomingTasks,
      memberTasks,
      formations,
      reports,
      objectiveReports,
      events,
      objectiveTasks,
      statsSnapshots: mockStatsSnapshots,
      signatureDataUrl,
      toggleMemberStatus: (id: string) => {
        void (async () => {
          try {
            const currentMember = teams.flatMap((team) => team.members).find((member) => member.id === id);
            if (!currentMember) return;
            const response = await fetchJsonOrThrow<{ member: { id: string; firstName: string; lastName: string; isActive: boolean } }>(
              `/api/superviseur/team-members/${id}/status`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentMember.isActive }),
              }
            );

            setTeams((current) =>
              current.map((team) => ({
                ...team,
                members: team.members.map((member) =>
                  member.id === response.member.id
                    ? {
                        ...member,
                        isActive: response.member.isActive,
                      }
                    : member
                ),
              }))
            );
          } catch (error) {
            console.error('[superviseur-provider] toggleMemberStatus failed', error);
          }
        })();
      },
      createMemberTask: async (input: NewTeamTaskInput) => {
        try {
          const team = findTeamForMember(teams, input.membreId);
          if (!team) return;
          const response = await fetchJsonOrThrow<{ task: TeamTaskApiRecord }>(
            '/api/superviseur/team-tasks',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  teamId: team.id,
                  assignedEmployeeId: input.membreId,
                  title: input.titre,
                  description: input.description,
                  dateDebut: input.dateDebut,
                  dateFin: input.dateFin,
                  priority: input.priorite,
                }),
            }
          );
          setMemberTasks((current) => [mapTeamTaskToMemberTask(response.task), ...current]);
        } catch (error) {
          console.error('[superviseur-provider] createMemberTask failed', error);
          throw error;
        }
      },
      updateIncomingTaskStatus: (id: string, status: SupervisorTaskStatus) => {
        setIncomingTasks((current) =>
          current.map((task) => {
            if (task.id !== id || isLocked(task.statut)) return task;
            return { ...task, statut: status };
          })
        );
      },
      updateIncomingTaskNotes: (id: string, notes: string) => {
        setIncomingTasks((current) =>
          current.map((task) => {
            if (task.id !== id || isLocked(task.statut)) return task;
            return { ...task, notesSuperviseur: notes };
          })
        );
      },
      updateIncomingTaskReport: (id: string, report: string) => {
        setIncomingTasks((current) =>
          current.map((task) => {
            if (task.id !== id || isLocked(task.statut)) return task;
            return { ...task, rapportSuperviseur: report };
          })
        );
      },
      updateMemberTaskStatus: (id: string, status: SupervisorTaskStatus, notes?: string) => {
        void (async () => {
          try {
            const note = typeof notes === 'string' && notes.trim() ? notes.trim() : undefined;
            const response = await fetchJsonOrThrow<{ task: TeamTaskApiRecord }>(
              `/api/superviseur/team-tasks/${id}`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                  note
                    ? { status, supervisorNote: note }
                    : { status }
                ),
              }
            );
            setMemberTasks((current) => current.map((task) => (task.id === id ? mapTeamTaskToMemberTask(response.task) : task)));
          } catch (error) {
            console.error('[superviseur-provider] updateMemberTaskStatus failed', error);
          }
        })();
      },
      updateMemberTaskNotes: async (id: string, notes: string) => {
        try {
          const response = await fetchJsonOrThrow<{ task: TeamTaskApiRecord }>(
            `/api/superviseur/team-tasks/${id}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ supervisorNote: notes }),
            }
          );
          setMemberTasks((current) => current.map((task) => (task.id === id ? mapTeamTaskToMemberTask(response.task) : task)));
        } catch (error) {
          console.error('[superviseur-provider] updateMemberTaskNotes failed', error);
          throw error;
        }
      },
      validateMemberTaskResult: (id: string, notes?: string) => {
        void (async () => {
          try {
            const body: Record<string, unknown> = { status: 'termine', isValidated: true };
            if (typeof notes === 'string') {
              body.supervisorNote = notes;
            }
            const response = await fetchJsonOrThrow<{ task: TeamTaskApiRecord }>(
              `/api/superviseur/team-tasks/${id}`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              }
            );
            setMemberTasks((current) => current.map((task) => (task.id === id ? mapTeamTaskToMemberTask(response.task) : task)));
          } catch (error) {
            console.error('[superviseur-provider] validateMemberTaskResult failed', error);
          }
        })();
      },
      validateReport: (id: string) => {
        setReports((current) =>
          current.map((report) =>
            report.id === id ? { ...report, statut: 'valide', signatureApposee: true } : report
          )
        );
      },
      requestReportCorrection: (id: string, motif: string) => {
        setReports((current) =>
          current.map((report) =>
            report.id === id ? { ...report, statut: 'correction_demandee', correctionMotif: motif } : report
          )
        );
      },
      authorizeDirectorAccess: (id: string) => {
        setReports((current) =>
          current.map((report) =>
            report.id === id ? { ...report, statut: 'transmis_directeur' as SupervisorReportStatus } : report
          )
        );
      },
      createReport: (input: NewReportInput) => {
        const event = events.find((item) => item.id === input.evenementId);
        const firstMember = members.find((member) => input.participantsIds.includes(member.id));
        if (!event || !firstMember) return;
        setReports((current) => [
          {
            id: `rep-${Date.now()}`,
            origine: 'cree',
            titre: `Rapport ${input.type.toLowerCase()} - ${event.titre}`,
            membreNom: `${firstMember.prenom} ${firstMember.nom}`,
            membreId: firstMember.id,
            mois: new Date(input.dateEvenement).toLocaleDateString('fr-FR', {
              month: 'long',
              year: 'numeric',
            }),
            dateSoumission: new Date().toISOString().slice(0, 10),
            statut: 'en_attente',
            type: input.type,
            evenementId: input.evenementId,
            evenementTitre: event.titre,
            contenu: input.contenu,
            pdfName: `${event.titre.toLowerCase().replace(/\s+/g, '-')}.pdf`,
            correctionMotif: '',
            signatureApposee: false,
          },
          ...current,
        ]);
      },
      addObjectiveReport: (report: SupervisorObjectiveReport) => {
        setObjectiveReports((current) => [report, ...current.filter((item) => item.id !== report.id)]);
      },
      setSignature: (dataUrl: string | null) => {
        setSignatureDataUrl(dataUrl);
      },
    }),
    [events, incomingTasks, memberTasks, members, objectiveTasks, objectiveReports, reports, signatureDataUrl, superviseur, teams, formations]
  );

  return <SupervisorDemoContext.Provider value={value}>{children}</SupervisorDemoContext.Provider>;
}

export function useSuperviseurDemo() {
  const context = useContext(SupervisorDemoContext);
  if (!context) {
    throw new Error('useSuperviseurDemo must be used within SuperviseurProvider');
  }
  return context;
}

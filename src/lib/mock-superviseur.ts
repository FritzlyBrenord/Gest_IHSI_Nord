export type SupervisorMemberStatus = 'actif' | 'inactif';
export type SupervisorTaskStatus = 'a_faire' | 'en_cours' | 'termine' | 'en_retard';
export type SupervisorTaskPriority = 'haute' | 'normale' | 'basse';
export type SupervisorReportStatus =
  | 'en_attente'
  | 'valide'
  | 'correction_demandee'
  | 'transmis_directeur'
  | 'signe_directeur';
export type SupervisorFormationStatus = 'passee' | 'prevue';
export type SupervisorPeriodFilter = 'mois' | 'trimestre' | 'annee';

export interface MockSupervisor {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'superviseur';
  equipeId: string;
  poste: string;
}

export interface MockSupervisorMember {
  id: string;
  nom: string;
  prenom: string;
  poste: string;
  statut: SupervisorMemberStatus;
  email: string;
}

export interface MockSupervisorIncomingTask {
  id: string;
  titre: string;
  description: string;
  source: string;
  teamId: string;
  statut: SupervisorTaskStatus;
  priorite: SupervisorTaskPriority;
  dateDebut: string;
  dateFin: string;
  notesSuperviseur: string;
  rapportSuperviseur: string;
}

export interface MockSupervisorMemberTask {
  id: string;
  membreId: string;
  titre: string;
  description: string;
  statut: SupervisorTaskStatus;
  priorite: SupervisorTaskPriority;
  dateDebut: string;
  dateFin: string;
  notesSuperviseur: string;
  supervisorNotes?: Array<{
    note: string | null;
    createdAt: string;
  }>;
  rapportEmploye: string;
  employeeStatusNotes?: Array<{
    status: SupervisorTaskStatus;
    note: string | null;
    createdAt: string;
  }>;
  resultatValide: boolean;
  validatedAt?: string | null;
  evaluation: number | null;
  appreciation: string;
  satisfaction: number;
  creeLe: string;
  createdAt?: string;
}

export interface MockSupervisorFormation {
  id: string;
  titre: string;
  date: string;
  statut: SupervisorFormationStatus;
  superviseur: string;
  lieu: string;
  duree: string;
  mode: 'Presentiel' | 'En ligne';
}

export interface MockSupervisorReport {
  id: string;
  origine: 'recu' | 'cree';
  titre: string;
  membreNom: string;
  membreId: string;
  mois: string;
  dateSoumission: string;
  statut: SupervisorReportStatus;
  type: 'Formation' | 'Reunion';
  evenementId: string;
  evenementTitre: string;
  contenu: string;
  pdfName: string;
  correctionMotif: string;
  signatureApposee: boolean;
}

export interface MockSupervisorEvent {
  id: string;
  type: 'Formation' | 'Reunion';
  titre: string;
  date: string;
  responsable: string;
  lieu?: string;
}

export interface MockSupervisorSurvey {
  id: string;
  titre: string;
  date: string;
  statut: 'ouverte' | 'cloturee' | 'planifiee';
  responsable: string;
  cible: string;
  tauxParticipation: number;
}

export interface MockSupervisorStatsSnapshot {
  id: string;
  label: string;
  period: SupervisorPeriodFilter;
  objectifsFixes: number;
  objectifsTermines: number;
  objectifsBloques: number;
  objectifsEnCours: number;
  satisfaction: number;
}

export const mockSuperviseur: MockSupervisor = {
  id: 'sup-001',
  nom: 'Martin',
  prenom: 'Jean',
  email: 'jean.martin@ihsi.ht',
  role: 'superviseur',
  equipeId: 'equipe-rh',
  poste: 'Superviseur Operations',
};

export const mockMembres: MockSupervisorMember[] = [
  { id: '1', nom: 'Dupont', prenom: 'Marie', poste: 'Analyste', statut: 'actif', email: 'marie@example.com' },
  { id: '2', nom: 'Paul', prenom: 'Jean', poste: 'Technicien', statut: 'actif', email: 'jean@example.com' },
  { id: '3', nom: 'Morin', prenom: 'Clara', poste: 'Coordinatrice', statut: 'inactif', email: 'clara@example.com' },
  { id: '4', nom: 'Noel', prenom: 'Samuel', poste: 'Statisticien', statut: 'actif', email: 'samuel@example.com' },
];

export const mockTachesRecues: MockSupervisorIncomingTask[] = [
  {
    id: 'incoming-1',
    titre: 'Cloturer le plan d execution trimestriel',
    description: 'Repartir les sous-taches dans l equipe, faire le suivi et remonter le rapport final a la direction.',
    source: 'Direction regionale',
    teamId: 'equipe-rh',
    statut: 'en_cours',
    priorite: 'haute',
    dateDebut: '2026-05-08',
    dateFin: '2026-05-29',
    notesSuperviseur: 'Prioriser les points en retard avant la reunion du vendredi.',
    rapportSuperviseur: 'Le cadrage est partage avec l equipe. Deux dependances restent ouvertes sur la partie logistique.',
  },
  {
    id: 'incoming-2',
    titre: 'Coordonner la revue mensuelle qualite',
    description: 'Verifier les livrables, collecter les rapports membres et soumettre un compte-rendu consolide.',
    source: 'Directeur adjoint',
    teamId: 'equipe-rh',
    statut: 'a_faire',
    priorite: 'normale',
    dateDebut: '2026-05-24',
    dateFin: '2026-06-05',
    notesSuperviseur: '',
    rapportSuperviseur: 'Aucun rapport superviseur renseigne pour le moment.',
  },
  {
    id: 'incoming-3',
    titre: 'Suivi du chantier statistique pilote',
    description: 'La mission est terminee. Le dossier est archive et verrouille pour garder la tracabilite.',
    source: 'Direction generale',
    teamId: 'equipe-rh',
    statut: 'termine',
    priorite: 'haute',
    dateDebut: '2026-04-10',
    dateFin: '2026-05-03',
    notesSuperviseur: 'Validation finale recue et communiquee aux parties prenantes.',
    rapportSuperviseur: 'Tous les objectifs ont ete livres, valides et clotures dans les delais prevus.',
  },
];

export const mockTachesEquipe: MockSupervisorMemberTask[] = [
  {
    id: 'team-task-1',
    membreId: '1',
    titre: 'Controle des livrables audit',
    description: 'Verifier la conformite des pieces et signaler les anomalies bloquees.',
    statut: 'en_cours',
    priorite: 'haute',
    dateDebut: '2026-05-10',
    dateFin: '2026-05-27',
    notesSuperviseur: 'Partager une synthese chaque fin de journee.',
    rapportEmploye: '70% des points sont traites, il reste les annexes du service logistique.',
    employeeStatusNotes: [
      { status: 'en_cours', note: 'Lancement du controle et collecte des premiers documents.', createdAt: '2026-05-11' },
      { status: 'en_cours', note: 'Les principaux livrables sont en revue, reste la validation croisee.', createdAt: '2026-05-19' },
    ],
    resultatValide: false,
    evaluation: null,
    appreciation: '',
    satisfaction: 78,
    creeLe: '2026-05-10',
  },
  {
    id: 'team-task-2',
    membreId: '1',
    titre: 'Mettre a jour la documentation processus',
    description: 'Actualiser les procedures et ajouter les nouvelles captures d ecran.',
    statut: 'a_faire',
    priorite: 'normale',
    dateDebut: '2026-05-22',
    dateFin: '2026-06-03',
    notesSuperviseur: '',
    rapportEmploye: 'Aucun rapport soumis pour le moment.',
    employeeStatusNotes: [],
    resultatValide: false,
    evaluation: null,
    appreciation: '',
    satisfaction: 0,
    creeLe: '2026-05-22',
  },
  {
    id: 'team-task-3',
    membreId: '2',
    titre: 'Compiler les actions correctives',
    description: 'Centraliser les retours des sections et preparer le tableau final.',
    statut: 'termine',
    priorite: 'haute',
    dateDebut: '2026-05-01',
    dateFin: '2026-05-15',
    notesSuperviseur: 'Livrable complet, bonne anticipation des blocages.',
    rapportEmploye: 'Le tableau final a ete livre avec toutes les justifications et les preuves attendues.',
    employeeStatusNotes: [
      { status: 'en_cours', note: 'Premier lot prepare avec les tableaux consolidés.', createdAt: '2026-05-06' },
      { status: 'termine', note: 'Livrable final transmis avec toutes les annexes.', createdAt: '2026-05-15' },
    ],
    resultatValide: true,
    validatedAt: '2026-05-15',
    evaluation: 92,
    appreciation: 'Excellent niveau de clarte et respect du delai.',
    satisfaction: 91,
    creeLe: '2026-05-01',
  },
  {
    id: 'team-task-4',
    membreId: '4',
    titre: 'Consolider les indicateurs qualite',
    description: 'Verifier la coherence des indicateurs avant transmission.',
    statut: 'en_retard',
    priorite: 'haute',
    dateDebut: '2026-05-05',
    dateFin: '2026-05-18',
    notesSuperviseur: 'Reprendre les calculs des deux derniers tableaux.',
    rapportEmploye: 'Le rapport est pret mais certaines validations croisees manquent encore.',
    employeeStatusNotes: [
      { status: 'en_retard', note: 'Retard lie a un manque de donnees pour une section.', createdAt: '2026-05-17' },
    ],
    resultatValide: false,
    evaluation: null,
    appreciation: '',
    satisfaction: 62,
    creeLe: '2026-05-05',
  },
];

export const mockFormations: MockSupervisorFormation[] = [
  { id: '1', titre: 'Leadership & Management', date: '2026-03-15', statut: 'passee', superviseur: 'Jean Martin', lieu: 'Salle A', duree: '3h', mode: 'Presentiel' },
  { id: '2', titre: 'Securite au travail', date: '2026-07-20', statut: 'prevue', superviseur: 'Jean Martin', lieu: 'En ligne', duree: '2h', mode: 'En ligne' },
  { id: '3', titre: 'Pilotage de projet', date: '2026-08-03', statut: 'prevue', superviseur: 'Jean Martin', lieu: 'Salle B', duree: '4h', mode: 'Presentiel' },
];

export const mockRapports: MockSupervisorReport[] = [
  {
    id: 'rep-1',
    origine: 'recu',
    titre: 'Rapport de reunion hebdomadaire',
    membreNom: 'Marie Dupont',
    membreId: '1',
    mois: 'Mai 2026',
    dateSoumission: '2026-05-18',
    statut: 'en_attente',
    type: 'Reunion',
    evenementId: 'evt-1',
    evenementTitre: 'Reunion de coordination',
    contenu: 'Compte-rendu des points d avancement, des ecarts et des actions correctives retenues.',
    pdfName: 'rapport-reunion-coordination.pdf',
    correctionMotif: '',
    signatureApposee: false,
  },
  {
    id: 'rep-2',
    origine: 'cree',
    titre: 'Rapport formation securite',
    membreNom: 'Jean Paul',
    membreId: '2',
    mois: 'Avril 2026',
    dateSoumission: '2026-04-27',
    statut: 'valide',
    type: 'Formation',
    evenementId: 'evt-2',
    evenementTitre: 'Formation securite',
    contenu: 'Synthese des modules couverts, liste de presence et recommandations de suivi.',
    pdfName: 'rapport-formation-securite.pdf',
    correctionMotif: '',
    signatureApposee: true,
  },
  {
    id: 'rep-3',
    origine: 'recu',
    titre: 'Rapport mensuel qualite',
    membreNom: 'Samuel Noel',
    membreId: '4',
    mois: 'Mai 2026',
    dateSoumission: '2026-05-21',
    statut: 'correction_demandee',
    type: 'Reunion',
    evenementId: 'evt-3',
    evenementTitre: 'Revue qualite',
    contenu: 'Version preliminaire du rapport mensuel avec actions correctives ouvertes.',
    pdfName: 'rapport-mensuel-qualite.pdf',
    correctionMotif: 'Ajouter les indicateurs de cloture et les signatures manquantes.',
    signatureApposee: false,
  },
];

export const mockEvenementsResponsable: MockSupervisorEvent[] = [
  { id: 'evt-1', type: 'Reunion', titre: 'Reunion de coordination', date: '2026-05-12', responsable: 'Jean Martin', lieu: 'Salle B' },
  { id: 'evt-2', type: 'Formation', titre: 'Formation securite', date: '2026-04-25', responsable: 'Jean Martin', lieu: 'En ligne' },
  { id: 'evt-3', type: 'Reunion', titre: 'Revue qualite', date: '2026-05-20', responsable: 'Jean Martin', lieu: 'Salle A' },
];

export const mockEnquetes: MockSupervisorSurvey[] = [
  {
    id: 'survey-1',
    titre: 'Enquete satisfaction equipe terrain',
    date: '2026-05-14',
    statut: 'ouverte',
    responsable: 'Jean Martin',
    cible: 'Agents terrain Nord',
    tauxParticipation: 68,
  },
  {
    id: 'survey-2',
    titre: 'Enquete post-formation securite',
    date: '2026-04-30',
    statut: 'cloturee',
    responsable: 'Jean Martin',
    cible: 'Participants formation securite',
    tauxParticipation: 91,
  },
  {
    id: 'survey-3',
    titre: 'Enquete besoins logiciels',
    date: '2026-06-10',
    statut: 'planifiee',
    responsable: 'Jean Martin',
    cible: 'Equipe statistique',
    tauxParticipation: 0,
  },
];

export const mockStatsSnapshots: MockSupervisorStatsSnapshot[] = [
  {
    id: 'stats-may',
    label: 'Mai 2026',
    period: 'mois',
    objectifsFixes: 14,
    objectifsTermines: 8,
    objectifsBloques: 2,
    objectifsEnCours: 4,
    satisfaction: 81,
  },
  {
    id: 'stats-q2',
    label: 'T2 2026',
    period: 'trimestre',
    objectifsFixes: 36,
    objectifsTermines: 24,
    objectifsBloques: 4,
    objectifsEnCours: 8,
    satisfaction: 79,
  },
  {
    id: 'stats-y2026',
    label: 'Annee 2026',
    period: 'annee',
    objectifsFixes: 58,
    objectifsTermines: 39,
    objectifsBloques: 7,
    objectifsEnCours: 12,
    satisfaction: 83,
  },
];

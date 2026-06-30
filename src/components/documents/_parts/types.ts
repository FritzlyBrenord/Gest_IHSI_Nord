// ============================================================
// TYPES — extraits de documents.tsx
// ============================================================

import { DocumentItem } from "@/types/document";

export type AppView = "dashboard" | "create" | "editor" | "event-compterendu";
export type CreateStep = 1 | 2 | 3 | 4 | 5 | 6;

// ─── EventData : données passées depuis la page Événements ───────────────────

export interface EventParticipantData {
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

export interface EventData {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  durationMins: number;
  type: 'PRESENTIEL' | 'EN_LIGNE' | 'HYBRIDE';
  category: 'REUNION' | 'FORMATION';
  location: string | null;
  platform: string | null;
  reportResponsible: {
    id: string;
    firstName: string;
    lastName: string;
    poste: string;
    department: string;
  } | null;
  participants: EventParticipantData[];
  status: string;
  existingDocument?: DocumentItem;
}

export type HybridStatus = 'PRESENTIEL' | 'EN_LIGNE' | 'ABSENT';
export type SimpleStatus = 'PRESENT' | 'ABSENT';
export type ParticipantStatus = HybridStatus | SimpleStatus;

export interface KeyPoint { id: string; title: string; description: string; }

export interface LetterFields {
  place: string;
  date: string;
  senderName: string;
  senderAddress: string;
  senderPhone: string;
  senderEmail: string;
  recipientName: string;
  recipientRole: string;
  recipientOrganization: string;
  recipientAddress: string;
  subject: string;
  body: string;
  closing: string;
  signatureName: string;
}

export interface ParsedLetter {
  showHeader: boolean;
  place: string;
  sender: string[];
  date: string;
  recipient: string[];
  subject: string;
  salutation: string;
  body: string[];
  closing: string;
  signature: string[];
}

export interface UserInfo { name: string; role: string; poste: string; isAdmin: boolean; }

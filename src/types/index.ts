export const CONTACT_STATUSES = ["pending", "prepared", "sent", "skipped", "failed"] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export interface Contact {
  id: string;
  firstName: string;
  fullName: string;
  linkedinUrl: string;
  linkedinMemberId?: string;
  headline?: string;
  email?: string;
  sourceEventUrls?: string[];
  status: ContactStatus;
  message: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  preparedAt?: string;
  sentAt?: string;
}

export interface LinkedInAttendee {
  firstName: string;
  fullName: string;
  linkedinUrl: string;
  linkedinMemberId?: string;
  headline?: string;
  email?: string;
}

export interface EventImportRecord {
  id: string;
  eventUrl: string;
  importedAt: string;
  previousAttendeeCount: number;
  attendeeCount: number;
  newContacts: number;
  duplicates: number;
}

export interface ExcludedContact {
  linkedinUrl: string;
  fullName: string;
  excludedAt: string;
}

export interface EventImportResult {
  eventUrl: string;
  previousAttendeeCount: number;
  attendeeCount: number;
  newContacts: number;
  duplicates: number;
  importedAt: string;
}

export type EventImportStage =
  | "queued"
  | "opening-event"
  | "opening-attendees"
  | "loading-attendees"
  | "saving"
  | "complete"
  | "failed";

export interface EventImportJob {
  id: string;
  eventUrl: string;
  stage: EventImportStage;
  message: string;
  discovered: number;
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  result?: EventImportResult;
  error?: string;
}

export interface AppData {
  version: 1;
  template: string;
  currentContactId: string | null;
  contacts: Contact[];
  excludedContacts: ExcludedContact[];
  eventImports: EventImportRecord[];
  updatedAt: string;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  invalid: number;
  errors: string[];
}

export interface BatchSendResult {
  requested: number;
  sent: Array<Pick<Contact, "id" | "fullName">>;
  failed?: Pick<Contact, "id" | "fullName"> & { error: string };
}

export interface PublicState extends AppData {
  counts: Record<ContactStatus, number> & { remaining: number; total: number };
}

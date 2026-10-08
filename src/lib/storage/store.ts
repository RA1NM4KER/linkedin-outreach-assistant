import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { deduplicateByLinkedInUrl, parseAndNormalizeCsv } from "@/lib/csv";
import { mergeEventAttendees } from "@/lib/eventContacts";
import { adjacentContactId, nextPendingId, shouldAdvanceAfterStatus } from "@/lib/queue";
import { interpolateTemplate } from "@/lib/template";
import { CONTACT_STATUSES, type AppData, type ContactStatus, type EventImportResult, type ImportResult, type LinkedInAttendee, type PublicState } from "@/types";

const DEFAULT_TEMPLATE = `Hi {firstName}! I saw that you’re interested in coming to my book launch, and I’d genuinely love to have you there.

I’m really looking forward to the day and getting to share such a special moment with everyone. If you’d like to join us, just make sure you’ve reserved your spot through Quicket, as the venue does have limited capacity.

If you’ve already got your ticket, you’re all set. I can’t wait to see you there!

https://qkt.io/IvSz9C`;
const dataDirectory = path.join(/* turbopackIgnore: true */ process.cwd(), "data");
const dataFile = path.join(dataDirectory, "outreach.json");
let writeQueue: Promise<unknown> = Promise.resolve();

function emptyData(): AppData {
  return { version: 1, template: DEFAULT_TEMPLATE, currentContactId: null, contacts: [], excludedContacts: [], eventImports: [], updatedAt: new Date().toISOString() };
}

async function readData(): Promise<AppData> {
  await mkdir(dataDirectory, { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8")) as AppData;
    return { ...parsed, excludedContacts: parsed.excludedContacts ?? [], eventImports: parsed.eventImports ?? [] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyData();
    throw error;
  }
}

async function atomicWrite(data: AppData): Promise<void> {
  const temporaryFile = `${dataFile}.${process.pid}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(temporaryFile, dataFile);
}

async function mutate<T>(operation: (data: AppData) => T | Promise<T>): Promise<T> {
  const pending = writeQueue.then(async () => {
    const data = await readData();
    const result = await operation(data);
    data.updatedAt = new Date().toISOString();
    await atomicWrite(data);
    return result;
  });
  writeQueue = pending.catch(() => undefined);
  return pending;
}

function withCounts(data: AppData): PublicState {
  const counts = Object.fromEntries(CONTACT_STATUSES.map((status) => [status, data.contacts.filter((contact) => contact.status === status).length])) as Record<ContactStatus, number>;
  return { ...data, counts: { ...counts, remaining: data.contacts.length - counts.sent - counts.skipped, total: data.contacts.length } };
}

export async function getState(): Promise<PublicState> {
  await writeQueue;
  return withCounts(await readData());
}

export async function importCsv(csvText: string): Promise<ImportResult> {
  const parsed = parseAndNormalizeCsv(csvText);
  return mutate((data) => {
    const deduplicated = deduplicateByLinkedInUrl(parsed.contacts, [
      ...data.contacts.map((contact) => contact.linkedinUrl),
      ...data.excludedContacts.map((contact) => contact.linkedinUrl),
    ]);
    const duplicates = deduplicated.duplicates;
    let imported = 0;
    for (const item of deduplicated.unique) {
      const now = new Date().toISOString();
      data.contacts.push({
        id: randomUUID(),
        ...item,
        status: "pending",
        message: interpolateTemplate(data.template, item),
        createdAt: now,
        updatedAt: now,
      });
      imported += 1;
    }
    if (!data.currentContactId && data.contacts.length > 0) data.currentContactId = data.contacts[0].id;
    return { imported, duplicates, invalid: parsed.invalid, errors: parsed.errors };
  });
}

export async function importLinkedInAttendees(eventUrl: string, attendees: LinkedInAttendee[]): Promise<EventImportResult> {
  return mutate((data) => mergeEventAttendees(data, eventUrl, attendees));
}

export async function updateTemplate(template: string): Promise<void> {
  await mutate((data) => {
    data.template = template;
    const now = new Date().toISOString();
    data.contacts.forEach((contact) => {
      contact.message = interpolateTemplate(template, contact);
      contact.updatedAt = now;
    });
  });
}

export async function updateContactStatus(id: string, status: ContactStatus): Promise<void> {
  await mutate((data) => {
    const contact = data.contacts.find((item) => item.id === id);
    if (!contact) throw new Error("Contact not found.");
    const now = new Date().toISOString();
    contact.status = status;
    contact.updatedAt = now;
    contact.error = undefined;
    if (status === "sent") contact.sentAt = now;
    else contact.sentAt = undefined;
    if (shouldAdvanceAfterStatus(status)) data.currentContactId = nextPendingId(data.contacts, id);
  });
}

export async function removeContact(id: string): Promise<void> {
  await mutate((data) => {
    const index = data.contacts.findIndex((contact) => contact.id === id);
    if (index < 0) throw new Error("Contact not found.");
    const [contact] = data.contacts.splice(index, 1);
    const excludedAt = new Date().toISOString();
    const existingExclusion = data.excludedContacts.find((item) => item.linkedinUrl.toLowerCase() === contact.linkedinUrl.toLowerCase());
    if (existingExclusion) {
      existingExclusion.fullName = contact.fullName;
      existingExclusion.excludedAt = excludedAt;
    } else {
      data.excludedContacts.push({ linkedinUrl: contact.linkedinUrl, fullName: contact.fullName, excludedAt });
    }
    if (data.currentContactId === id) data.currentContactId = nextPendingId(data.contacts, null);
  });
}

export async function markPrepared(id: string): Promise<void> {
  await mutate((data) => {
    const contact = data.contacts.find((item) => item.id === id);
    if (!contact) throw new Error("Contact not found.");
    const now = new Date().toISOString();
    contact.status = "prepared";
    contact.preparedAt = now;
    contact.updatedAt = now;
    contact.error = undefined;
    data.currentContactId = id;
  });
}

export async function markFailed(id: string, message: string): Promise<void> {
  await mutate((data) => {
    const contact = data.contacts.find((item) => item.id === id);
    if (!contact) throw new Error("Contact not found.");
    contact.status = "failed";
    contact.error = message;
    contact.updatedAt = new Date().toISOString();
  });
}

export async function navigate(direction: "next" | "previous" | "nextPending"): Promise<void> {
  await mutate((data) => {
    data.currentContactId = direction === "nextPending"
      ? nextPendingId(data.contacts, data.currentContactId)
      : adjacentContactId(data.contacts, data.currentContactId, direction);
  });
}

export async function selectContact(id: string): Promise<void> {
  await mutate((data) => {
    if (!data.contacts.some((contact) => contact.id === id)) throw new Error("Contact not found.");
    data.currentContactId = id;
  });
}

export async function resetData(): Promise<void> {
  await mutate((data) => Object.assign(data, emptyData()));
}

import { randomUUID } from "node:crypto";
import { canonicalizeLinkedInUrl } from "@/lib/csv";
import { interpolateTemplate } from "@/lib/template";
import type { AppData, EventImportResult, LinkedInAttendee } from "@/types";

export function mergeEventAttendees(
  data: AppData,
  eventUrl: string,
  attendees: LinkedInAttendee[],
  importedAt = new Date().toISOString(),
  createId: () => string = randomUUID,
): EventImportResult {
  const previousAttendeeCount = [...data.eventImports]
    .reverse()
    .find((record) => record.eventUrl === eventUrl)?.attendeeCount ?? 0;
  const existingByUrl = new Map(data.contacts.map((contact) => [contact.linkedinUrl.toLowerCase(), contact]));
  const excludedUrls = new Set(data.excludedContacts.map((contact) => contact.linkedinUrl.toLowerCase()));
  const uniqueAttendees = new Map<string, LinkedInAttendee>();

  for (const attendee of attendees) {
    const canonicalUrl = canonicalizeLinkedInUrl(attendee.linkedinUrl);
    if (!canonicalUrl) continue;
    uniqueAttendees.set(canonicalUrl.toLowerCase(), { ...attendee, linkedinUrl: canonicalUrl });
  }

  let newContacts = 0;
  for (const attendee of uniqueAttendees.values()) {
    if (excludedUrls.has(attendee.linkedinUrl.toLowerCase())) continue;
    const existing = existingByUrl.get(attendee.linkedinUrl.toLowerCase());
    if (existing) {
      existing.linkedinMemberId = attendee.linkedinMemberId ?? existing.linkedinMemberId;
      existing.headline = attendee.headline ?? existing.headline;
      existing.sourceEventUrls = Array.from(new Set([...(existing.sourceEventUrls ?? []), eventUrl]));
      continue;
    }

    const contact = {
      id: createId(),
      ...attendee,
      status: "pending" as const,
      message: interpolateTemplate(data.template, attendee),
      sourceEventUrls: [eventUrl],
      createdAt: importedAt,
      updatedAt: importedAt,
    };
    data.contacts.push(contact);
    existingByUrl.set(contact.linkedinUrl.toLowerCase(), contact);
    newContacts += 1;
  }

  if (!data.currentContactId && data.contacts.length > 0) data.currentContactId = data.contacts[0].id;
  const result: EventImportResult = {
    eventUrl,
    previousAttendeeCount,
    attendeeCount: uniqueAttendees.size,
    newContacts,
    duplicates: uniqueAttendees.size - newContacts,
    importedAt,
  };
  data.eventImports.push({ id: createId(), ...result });
  return result;
}

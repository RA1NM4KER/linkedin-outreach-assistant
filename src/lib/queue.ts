import type { Contact, ContactStatus } from "@/types";

export function nextPendingId(contacts: Contact[], currentId: string | null): string | null {
  if (contacts.length === 0) return null;
  const currentIndex = contacts.findIndex((contact) => contact.id === currentId);
  for (let step = 1; step <= contacts.length; step += 1) {
    const contact = contacts[(currentIndex + step) % contacts.length];
    if (contact.status === "pending" || contact.status === "failed") return contact.id;
  }
  return currentId && contacts.some((contact) => contact.id === currentId) ? currentId : contacts[0].id;
}

export function adjacentContactId(contacts: Contact[], currentId: string | null, direction: "next" | "previous"): string | null {
  if (contacts.length === 0) return null;
  const currentIndex = contacts.findIndex((contact) => contact.id === currentId);
  const safeIndex = currentIndex < 0 ? 0 : currentIndex;
  const delta = direction === "next" ? 1 : -1;
  return contacts[(safeIndex + delta + contacts.length) % contacts.length].id;
}

export function nextPendingBatch(contacts: Contact[], currentId: string | null, limit: number): Contact[] {
  if (contacts.length === 0 || limit <= 0) return [];
  const currentIndex = contacts.findIndex((contact) => contact.id === currentId);
  const startIndex = currentIndex < 0 ? 0 : currentIndex;
  const pending: Contact[] = [];
  for (let step = 0; step < contacts.length && pending.length < limit; step += 1) {
    const contact = contacts[(startIndex + step) % contacts.length];
    if (contact.status === "pending") pending.push(contact);
  }
  return pending;
}

export function shouldAdvanceAfterStatus(status: ContactStatus): boolean {
  return status === "sent" || status === "skipped";
}

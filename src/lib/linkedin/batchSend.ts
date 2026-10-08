import "server-only";
import { sendLinkedInMessage } from "@/lib/linkedin/prepareMessage";
import { markFailed, updateContactStatus } from "@/lib/storage/store";
import type { BatchSendResult, Contact } from "@/types";

declare global {
  var linkedInBatchSendPromise: Promise<BatchSendResult> | undefined;
}

async function runBatch(contacts: Contact[]): Promise<BatchSendResult> {
  const result: BatchSendResult = { requested: contacts.length, sent: [] };
  for (const contact of contacts) {
    try {
      await sendLinkedInMessage(contact.linkedinUrl, contact.message);
      await updateContactStatus(contact.id, "sent");
      result.sent.push({ id: contact.id, fullName: contact.fullName });
    } catch (error) {
      const message = error instanceof Error ? error.message : "LinkedIn automation failed.";
      await markFailed(contact.id, message).catch(() => undefined);
      result.failed = { id: contact.id, fullName: contact.fullName, error: message };
      break;
    }
  }
  return result;
}

export async function sendContactBatch(contacts: Contact[]): Promise<BatchSendResult> {
  if (globalThis.linkedInBatchSendPromise) throw new Error("A LinkedIn send batch is already running.");
  const batchPromise = runBatch(contacts);
  globalThis.linkedInBatchSendPromise = batchPromise;
  try {
    return await batchPromise;
  } finally {
    globalThis.linkedInBatchSendPromise = undefined;
  }
}

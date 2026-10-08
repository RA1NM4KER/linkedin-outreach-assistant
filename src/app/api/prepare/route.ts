import { errorResponse } from "@/lib/http";
import { prepareLinkedInMessage } from "@/lib/linkedin/prepareMessage";
import { getState, markFailed, markPrepared } from "@/lib/storage/store";

export const maxDuration = 60;

export async function POST(request: Request) {
  let contactId: string | undefined;
  try {
    const body = (await request.json()) as { contactId?: unknown };
    if (typeof body.contactId !== "string") return Response.json({ error: "contactId is required." }, { status: 400 });
    contactId = body.contactId;
    const state = await getState();
    const contact = state.contacts.find((item) => item.id === contactId);
    if (!contact) return Response.json({ error: "Contact not found." }, { status: 404 });
    await prepareLinkedInMessage(contact.linkedinUrl, contact.message);
    await markPrepared(contact.id);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LinkedIn automation failed.";
    if (contactId) await markFailed(contactId, message).catch(() => undefined);
    return errorResponse(error);
  }
}

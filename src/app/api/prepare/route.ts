import { errorMessage } from "@/lib/http";
import { closeLinkedInBrowser } from "@/lib/linkedin/browser";
import { sendLinkedInMessage } from "@/lib/linkedin/prepareMessage";
import { getState, markFailed, updateContactStatus } from "@/lib/storage/store";

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
    if (contact.status === "sent" || contact.status === "skipped") {
      return Response.json({ error: `This contact is already marked ${contact.status}.` }, { status: 409 });
    }
    await sendLinkedInMessage(contact.linkedinUrl, contact.message);
    await updateContactStatus(contact.id, "sent");
    await closeLinkedInBrowser();
    return Response.json({ ok: true });
  } catch (error) {
    const message = errorMessage(error, "LinkedIn automation failed.");
    if (contactId) await markFailed(contactId).catch(() => undefined);
    return Response.json({ error: message }, { status: 500 });
  }
}

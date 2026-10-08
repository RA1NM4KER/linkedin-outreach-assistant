import { errorResponse } from "@/lib/http";
import { sendContactBatch } from "@/lib/linkedin/batchSend";
import { getState } from "@/lib/storage/store";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { contactIds?: unknown };
    if (!Array.isArray(body.contactIds) || body.contactIds.length < 1 || body.contactIds.length > 5) {
      return Response.json({ error: "Choose between one and five contacts." }, { status: 400 });
    }
    if (!body.contactIds.every((id): id is string => typeof id === "string") || new Set(body.contactIds).size !== body.contactIds.length) {
      return Response.json({ error: "Contact IDs must be unique strings." }, { status: 400 });
    }

    const state = await getState();
    const contacts = body.contactIds.map((id) => state.contacts.find((contact) => contact.id === id));
    if (contacts.some((contact) => !contact)) return Response.json({ error: "One or more contacts no longer exist." }, { status: 404 });
    if (contacts.some((contact) => contact?.status !== "pending")) {
      return Response.json({ error: "Only pending contacts can be sent in a test batch." }, { status: 409 });
    }

    return Response.json(await sendContactBatch(contacts as NonNullable<(typeof contacts)[number]>[]));
  } catch (error) {
    return errorResponse(error);
  }
}

import { errorResponse } from "@/lib/http";
import { removeContact, updateContactStatus } from "@/lib/storage/store";
import { CONTACT_STATUSES, type ContactStatus } from "@/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: unknown };
    if (!CONTACT_STATUSES.includes(body.status as ContactStatus)) {
      return Response.json({ error: "Invalid contact status." }, { status: 400 });
    }
    await updateContactStatus(id, body.status as ContactStatus);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, error instanceof Error && error.message === "Contact not found." ? 404 : 500);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await removeContact(id);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, error instanceof Error && error.message === "Contact not found." ? 404 : 500);
  }
}

import { errorResponse } from "@/lib/http";
import { navigate, selectContact } from "@/lib/storage/store";

const directions = ["next", "previous", "nextPending"] as const;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { direction?: unknown; contactId?: unknown };
    if (typeof body.contactId === "string") {
      await selectContact(body.contactId);
      return Response.json({ ok: true });
    }
    if (!directions.includes(body.direction as (typeof directions)[number])) {
      return Response.json({ error: "Invalid navigation direction." }, { status: 400 });
    }
    await navigate(body.direction as (typeof directions)[number]);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

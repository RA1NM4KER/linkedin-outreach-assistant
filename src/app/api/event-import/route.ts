import { errorResponse } from "@/lib/http";
import { startEventImport } from "@/lib/linkedin/eventImportJobs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { eventUrl?: unknown };
    if (typeof body.eventUrl !== "string") return Response.json({ error: "eventUrl is required." }, { status: 400 });
    return Response.json(startEventImport(body.eventUrl), { status: 202 });
  } catch (error) {
    return errorResponse(error, 400);
  }
}

import { getEventImportJob } from "@/lib/linkedin/eventImportJobs";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext<"/api/event-import/[id]">) {
  const { id } = await context.params;
  const job = getEventImportJob(id);
  if (!job) return Response.json({ error: "Import job not found." }, { status: 404 });
  return Response.json(job, { headers: { "Cache-Control": "no-store" } });
}

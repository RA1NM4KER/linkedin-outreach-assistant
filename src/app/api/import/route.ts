import { errorResponse } from "@/lib/http";
import { importCsv } from "@/lib/storage/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { csvText?: unknown };
    if (typeof body.csvText !== "string") return Response.json({ error: "csvText is required." }, { status: 400 });
    return Response.json(await importCsv(body.csvText));
  } catch (error) {
    return errorResponse(error);
  }
}

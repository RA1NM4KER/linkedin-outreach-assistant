import { errorResponse } from "@/lib/http";
import { resetData } from "@/lib/storage/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { confirmation?: unknown };
    if (body.confirmation !== "RESET") return Response.json({ error: "Reset confirmation is required." }, { status: 400 });
    await resetData();
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

import { errorResponse } from "@/lib/http";
import { updateTemplate } from "@/lib/storage/store";

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { template?: unknown };
    if (typeof body.template !== "string" || !body.template.trim()) {
      return Response.json({ error: "Template cannot be empty." }, { status: 400 });
    }
    await updateTemplate(body.template);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

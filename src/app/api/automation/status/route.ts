import { errorResponse } from "@/lib/http";
import { getComposerStatus } from "@/lib/linkedin/prepareMessage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getComposerStatus(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

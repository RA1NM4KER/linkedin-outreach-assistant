import { errorResponse } from "@/lib/http";
import { openLinkedIn } from "@/lib/linkedin/browser";

export const maxDuration = 60;

export async function POST() {
  try {
    await openLinkedIn();
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

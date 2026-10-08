import { contactsToCsv } from "@/lib/csv";
import { errorResponse } from "@/lib/http";
import { getState } from "@/lib/storage/store";

export async function GET() {
  try {
    const state = await getState();
    return new Response(contactsToCsv(state.contacts), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="linkedin-outreach-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export function errorMessage(error: unknown, fallback = "An unexpected error occurred."): string {
  const raw = error instanceof Error ? error.message : fallback;
  const message = raw.replace(/\u001b\[[0-9;]*m/g, "").split("\nCall log:")[0].trim();
  if (/executable doesn['’]t exist|download new browsers/i.test(message)) {
    return "No compatible automation browser is available. Choose an installed Brave, Chrome, Edge, or Chromium browser, or configure an existing Playwright Firefox runtime.";
  }
  if (/target page, context or browser has been closed/i.test(message)) {
    return "The LinkedIn browser closed before preparation finished. Keep it open and retry.";
  }
  return message || fallback;
}

export function errorResponse(error: unknown, status = 500): Response {
  return Response.json({ error: errorMessage(error) }, { status });
}

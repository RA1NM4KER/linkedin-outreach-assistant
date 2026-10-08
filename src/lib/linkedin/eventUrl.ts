export function normalizeLinkedInEventUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid LinkedIn Event URL.");
  }
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const pathname = url.pathname.toLowerCase();
  const isEventUrl = pathname.startsWith("/events/") || pathname.startsWith("/event/manage/");
  if (url.protocol !== "https:" || hostname !== "linkedin.com" || !isEventUrl) {
    throw new Error("Use a LinkedIn /events/... or organizer /event/manage/... URL.");
  }
  url.hostname = "www.linkedin.com";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

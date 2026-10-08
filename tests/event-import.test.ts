import { describe, expect, it } from "vitest";
import { mergeEventAttendees } from "@/lib/eventContacts";
import { normalizeLinkedInEventUrl } from "@/lib/linkedin/eventUrl";
import type { AppData } from "@/types";

function data(): AppData {
  return {
    version: 1,
    template: "Hi {firstName}",
    currentContactId: "existing",
    contacts: [{
      id: "existing",
      firstName: "Carla",
      fullName: "Carla Meyer",
      linkedinUrl: "https://www.linkedin.com/in/carla",
      status: "sent",
      message: "Hi Carla",
      createdAt: "earlier",
      updatedAt: "earlier",
    }],
    excludedContacts: [],
    eventImports: [],
    updatedAt: "earlier",
  };
}

describe("LinkedIn event import", () => {
  it("accepts public and organizer event URLs and removes tracking data", () => {
    expect(normalizeLinkedInEventUrl("https://linkedin.com/events/example-123/?tracking=1#top"))
      .toBe("https://www.linkedin.com/events/example-123");
    expect(normalizeLinkedInEventUrl("https://www.linkedin.com/event/manage/7508402394720874496/"))
      .toBe("https://www.linkedin.com/event/manage/7508402394720874496");
    expect(() => normalizeLinkedInEventUrl("https://example.com/events/123")).toThrow();
  });

  it("adds new attendees while preserving existing outreach statuses", () => {
    const state = data();
    const ids = ["new-contact", "import-record"];
    const result = mergeEventAttendees(state, "https://www.linkedin.com/event/manage/1", [
      { firstName: "Carla", fullName: "Carla Meyer", linkedinUrl: "https://linkedin.com/in/carla/", headline: "Updated headline" },
      { firstName: "Amber", fullName: "Amber Walsh", linkedinUrl: "https://linkedin.com/in/amber", headline: "Illustrator" },
      { firstName: "Amber", fullName: "Duplicate Amber", linkedinUrl: "https://linkedin.com/in/amber/?trk=event" },
    ], "now", () => ids.shift() ?? "fallback");

    expect(result).toMatchObject({ attendeeCount: 2, newContacts: 1, duplicates: 1, previousAttendeeCount: 0 });
    expect(state.contacts[0]).toMatchObject({ status: "sent", headline: "Updated headline" });
    expect(state.contacts[1]).toMatchObject({ id: "new-contact", status: "pending", message: "Hi Amber" });
    expect(state.eventImports).toHaveLength(1);
  });

  it("reports growth on a later import without duplicating contacts", () => {
    const state = data();
    state.eventImports.push({ id: "old", eventUrl: "https://www.linkedin.com/event/manage/1", importedAt: "old", previousAttendeeCount: 0, attendeeCount: 1, newContacts: 1, duplicates: 0 });
    const result = mergeEventAttendees(state, "https://www.linkedin.com/event/manage/1", [
      { firstName: "Carla", fullName: "Carla Meyer", linkedinUrl: "https://linkedin.com/in/carla" },
      { firstName: "New", fullName: "New Attendee", linkedinUrl: "https://linkedin.com/in/new" },
    ], "now", () => "generated");
    expect(result).toMatchObject({ previousAttendeeCount: 1, attendeeCount: 2, newContacts: 1, duplicates: 1 });
  });

  it("does not restore locally excluded contacts on re-import", () => {
    const state = data();
    state.excludedContacts.push({ linkedinUrl: "https://www.linkedin.com/in/excluded", fullName: "Excluded Person", excludedAt: "earlier" });
    const result = mergeEventAttendees(state, "https://www.linkedin.com/event/manage/1", [
      { firstName: "Excluded", fullName: "Excluded Person", linkedinUrl: "https://linkedin.com/in/excluded" },
    ], "now", () => "record");
    expect(result).toMatchObject({ attendeeCount: 1, newContacts: 0, duplicates: 1 });
    expect(state.contacts).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { adjacentContactId, nextPendingBatch, nextPendingId, shouldAdvanceAfterStatus } from "@/lib/queue";
import type { Contact, ContactStatus } from "@/types";

function contact(id: string, status: ContactStatus): Contact {
  return { id, status, firstName: id, fullName: id, linkedinUrl: `https://www.linkedin.com/in/${id}`, message: "", createdAt: "", updatedAt: "" };
}

describe("queue progression", () => {
  const contacts = [contact("a", "sent"), contact("b", "prepared"), contact("c", "pending"), contact("d", "failed")];

  it("selects the next actionable contact and wraps", () => {
    expect(nextPendingId(contacts, "a")).toBe("c");
    expect(nextPendingId(contacts, "c")).toBe("d");
    expect(nextPendingId(contacts, "d")).toBe("c");
    expect(nextPendingId([contact("x", "pending")], null)).toBe("x");
  });

  it("supports previous and next navigation", () => {
    expect(adjacentContactId(contacts, "a", "previous")).toBe("d");
    expect(adjacentContactId(contacts, "d", "next")).toBe("a");
  });

  it("only auto-advances for completed dispositions", () => {
    expect(shouldAdvanceAfterStatus("sent")).toBe(true);
    expect(shouldAdvanceAfterStatus("skipped")).toBe(true);
    expect(shouldAdvanceAfterStatus("prepared")).toBe(false);
  });

  it("selects a capped pending batch from the current queue position", () => {
    const batchContacts = [contact("a", "pending"), contact("b", "sent"), contact("c", "pending"), contact("d", "failed"), contact("e", "pending")];
    expect(nextPendingBatch(batchContacts, "c", 2).map(({ id }) => id)).toEqual(["c", "e"]);
    expect(nextPendingBatch(batchContacts, "e", 5).map(({ id }) => id)).toEqual(["e", "a", "c"]);
    expect(nextPendingBatch(batchContacts, "a", 0)).toEqual([]);
  });
});

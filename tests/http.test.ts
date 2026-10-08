import { describe, expect, it } from "vitest";
import { errorMessage } from "@/lib/http";

describe("errorMessage", () => {
  it("turns a missing Playwright browser into an actionable message", () => {
    expect(errorMessage(new Error("Executable doesn't exist at /tmp/chrome\nPlease download new browsers")))
      .toBe("No compatible automation browser is available. Choose an installed Brave, Chrome, Edge, or Chromium browser, or configure an existing Playwright Firefox runtime.");
  });

  it("removes Playwright call logs from stored errors", () => {
    expect(errorMessage(new Error("locator.click: Timeout 4000ms exceeded\nCall log:\n - waiting for locator")))
      .toBe("locator.click: Timeout 4000ms exceeded");
  });
});

import { describe, expect, it } from "vitest";
import { browserPreference, chromiumBrowserCandidates, findChromiumBrowser } from "@/lib/linkedin/browserExecutable";

describe("automation browser discovery", () => {
  it("defaults invalid preferences to automatic detection", () => {
    expect(browserPreference({})).toBe("auto");
    expect(browserPreference({ LINKEDIN_BROWSER: "opera" })).toBe("auto");
    expect(browserPreference({ LINKEDIN_BROWSER: "firefox" })).toBe("firefox");
  });

  it("uses an explicit executable before standard locations", () => {
    const candidates = chromiumBrowserCandidates({
      env: { LINKEDIN_BROWSER: "edge", LINKEDIN_BROWSER_EXECUTABLE: "/custom/edge" },
      homeDirectory: "/Users/test",
      platform: "darwin",
    });

    expect(candidates[0]).toEqual({ name: "edge", executablePath: "/custom/edge" });
  });

  it("auto-detects Chromium browsers in preference order", () => {
    const browser = findChromiumBrowser(
      { env: {}, homeDirectory: "/Users/test", platform: "darwin" },
      (candidate) => candidate.includes("Google Chrome.app") || candidate.includes("Microsoft Edge.app"),
    );

    expect(browser?.name).toBe("chrome");
  });

  it("honours a specific installed-browser preference", () => {
    const browser = findChromiumBrowser(
      { env: { LINKEDIN_BROWSER: "edge" }, homeDirectory: "/Users/test", platform: "darwin" },
      () => true,
    );

    expect(browser?.name).toBe("edge");
  });

  it("falls back cleanly when no Chromium browser is available", () => {
    expect(findChromiumBrowser({ env: {}, platform: "linux" }, () => false)).toBeUndefined();
  });
});

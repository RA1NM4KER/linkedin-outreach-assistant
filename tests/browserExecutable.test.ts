import { describe, expect, it } from "vitest";
import { braveExecutableCandidates, findBraveExecutable } from "@/lib/linkedin/browserExecutable";

describe("Brave executable discovery", () => {
  it("uses an explicit override before standard locations", () => {
    const candidates = braveExecutableCandidates({
      env: { LINKEDIN_BROWSER_EXECUTABLE: "/custom/brave" },
      homeDirectory: "/Users/test",
      platform: "darwin",
    });

    expect(candidates[0]).toBe("/custom/brave");
  });

  it("finds Brave in the standard macOS application location", () => {
    const executable = findBraveExecutable(
      { env: {}, homeDirectory: "/Users/test", platform: "darwin" },
      (candidate) => candidate === "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    );

    expect(executable).toBe("/Applications/Brave Browser.app/Contents/MacOS/Brave Browser");
  });

  it("falls back cleanly when Brave is unavailable", () => {
    expect(findBraveExecutable({ env: {}, platform: "linux" }, () => false)).toBeUndefined();
  });
});

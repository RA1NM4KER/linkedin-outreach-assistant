import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

interface BrowserPathOptions {
  env?: Record<string, string | undefined>;
  homeDirectory?: string;
  platform?: NodeJS.Platform;
}

export const BROWSER_PREFERENCES = ["auto", "brave", "chrome", "edge", "chromium", "firefox"] as const;
export type BrowserPreference = (typeof BROWSER_PREFERENCES)[number];
export type ChromiumBrowserName = Exclude<BrowserPreference, "auto" | "firefox">;

export interface BrowserExecutable {
  name: ChromiumBrowserName;
  executablePath: string;
}

function applicationPaths(homeDirectory: string): Record<ChromiumBrowserName, string[]> {
  return {
    brave: [
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      path.join(homeDirectory, "Applications/Brave Browser.app/Contents/MacOS/Brave Browser"),
    ],
    chrome: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      path.join(homeDirectory, "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    ],
    edge: [
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      path.join(homeDirectory, "Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
    ],
    chromium: [
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      path.join(homeDirectory, "Applications/Chromium.app/Contents/MacOS/Chromium"),
    ],
  };
}

function windowsPaths(env: Record<string, string | undefined>): Record<ChromiumBrowserName, string[]> {
  const local = env.LOCALAPPDATA;
  const programFiles = [env.PROGRAMFILES, env["PROGRAMFILES(X86)"]].filter((value): value is string => Boolean(value));
  return {
    brave: [
      ...(local ? [path.join(local, "BraveSoftware/Brave-Browser/Application/brave.exe")] : []),
      ...programFiles.map((root) => path.join(root, "BraveSoftware/Brave-Browser/Application/brave.exe")),
    ],
    chrome: [
      ...(local ? [path.join(local, "Google/Chrome/Application/chrome.exe")] : []),
      ...programFiles.map((root) => path.join(root, "Google/Chrome/Application/chrome.exe")),
    ],
    edge: [
      ...(local ? [path.join(local, "Microsoft/Edge/Application/msedge.exe")] : []),
      ...programFiles.map((root) => path.join(root, "Microsoft/Edge/Application/msedge.exe")),
    ],
    chromium: local ? [path.join(local, "Chromium/Application/chrome.exe")] : [],
  };
}

function linuxPaths(): Record<ChromiumBrowserName, string[]> {
  return {
    brave: ["/usr/bin/brave-browser", "/usr/bin/brave", "/snap/bin/brave"],
    chrome: ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome"],
    edge: ["/usr/bin/microsoft-edge-stable", "/usr/bin/microsoft-edge"],
    chromium: ["/usr/bin/chromium-browser", "/usr/bin/chromium", "/snap/bin/chromium"],
  };
}

export function browserPreference(env: Record<string, string | undefined> = process.env): BrowserPreference {
  const requested = env.LINKEDIN_BROWSER?.trim().toLowerCase();
  return BROWSER_PREFERENCES.find((name) => name === requested) ?? "auto";
}

export function chromiumBrowserCandidates({
  env = process.env,
  homeDirectory = homedir(),
  platform = process.platform,
}: BrowserPathOptions = {}): BrowserExecutable[] {
  const paths = platform === "darwin" ? applicationPaths(homeDirectory) : platform === "win32" ? windowsPaths(env) : linuxPaths();
  const preference = browserPreference(env);
  const names: ChromiumBrowserName[] = preference === "auto" || preference === "firefox"
    ? ["brave", "chrome", "edge", "chromium"]
    : [preference];
  const configuredPath = env.LINKEDIN_BROWSER_EXECUTABLE?.trim();
  const candidates: BrowserExecutable[] = configuredPath && preference !== "firefox"
    ? [{ name: preference === "auto" ? "chromium" : preference, executablePath: configuredPath }]
    : [];

  for (const name of names) candidates.push(...paths[name].map((executablePath) => ({ name, executablePath })));

  return candidates.filter((candidate, index, all) => all.findIndex((item) => item.executablePath === candidate.executablePath) === index);
}

export function findChromiumBrowser(
  options: BrowserPathOptions = {},
  pathExists: (candidate: string) => boolean = existsSync,
): BrowserExecutable | undefined {
  return chromiumBrowserCandidates(options).find((candidate) => pathExists(candidate.executablePath));
}

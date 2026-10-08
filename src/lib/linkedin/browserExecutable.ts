import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

interface BrowserPathOptions {
  env?: Record<string, string | undefined>;
  homeDirectory?: string;
  platform?: NodeJS.Platform;
}

export function braveExecutableCandidates({
  env = process.env,
  homeDirectory = homedir(),
  platform = process.platform,
}: BrowserPathOptions = {}): string[] {
  const configuredPath = env.LINKEDIN_BROWSER_EXECUTABLE?.trim();
  const candidates = configuredPath ? [configuredPath] : [];

  if (platform === "darwin") {
    candidates.push(
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      path.join(homeDirectory, "Applications/Brave Browser.app/Contents/MacOS/Brave Browser"),
    );
  } else if (platform === "win32") {
    if (env.LOCALAPPDATA) candidates.push(path.join(env.LOCALAPPDATA, "BraveSoftware/Brave-Browser/Application/brave.exe"));
    if (env.PROGRAMFILES) candidates.push(path.join(env.PROGRAMFILES, "BraveSoftware/Brave-Browser/Application/brave.exe"));
    if (env["PROGRAMFILES(X86)"]) candidates.push(path.join(env["PROGRAMFILES(X86)"], "BraveSoftware/Brave-Browser/Application/brave.exe"));
  } else {
    candidates.push("/usr/bin/brave-browser", "/usr/bin/brave", "/snap/bin/brave");
  }

  return [...new Set(candidates)];
}

export function findBraveExecutable(
  options: BrowserPathOptions = {},
  pathExists: (candidate: string) => boolean = existsSync,
): string | undefined {
  return braveExecutableCandidates(options).find(pathExists);
}

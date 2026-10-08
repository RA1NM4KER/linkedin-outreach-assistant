import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium, firefox, type BrowserContext, type Page } from "playwright";
import { browserPreference, findChromiumBrowser } from "@/lib/linkedin/browserExecutable";

declare global {
  var linkedInContextPromise: Promise<BrowserContext> | undefined;
}

async function createContext(): Promise<BrowserContext> {
  const preference = browserPreference();
  const profileDirectory = path.join(/* turbopackIgnore: true */ process.cwd(), ".playwright-profile");

  if (preference === "firefox") {
    const configuredPath = process.env.LINKEDIN_BROWSER_EXECUTABLE?.trim();
    if (!configuredPath && !existsSync(firefox.executablePath())) {
      throw new Error("Firefox support is selected, but no Playwright-compatible Firefox runtime is already available.");
    }
    return firefox.launchPersistentContext(`${profileDirectory}-firefox`, {
      ...(configuredPath ? { executablePath: configuredPath } : {}),
      headless: false,
      viewport: null,
    });
  }

  const installedBrowser = findChromiumBrowser();
  const bundledChromiumAvailable = existsSync(chromium.executablePath());
  if (!installedBrowser && preference !== "auto" && preference !== "chromium") {
    throw new Error(`The selected ${preference} browser is not installed in a standard location.`);
  }
  if (!installedBrowser && !bundledChromiumAvailable) {
    if (preference === "auto" && existsSync(firefox.executablePath())) {
      return firefox.launchPersistentContext(`${profileDirectory}-firefox`, { headless: false, viewport: null });
    }
    throw new Error("No compatible automation browser is already available.");
  }

  return chromium.launchPersistentContext(profileDirectory, {
    ...(installedBrowser ? { executablePath: installedBrowser.executablePath } : {}),
    headless: false,
    viewport: null,
    args: ["--start-maximized"],
  });
}

export async function launchLinkedInBrowser(): Promise<BrowserContext> {
  if (!globalThis.linkedInContextPromise) {
    const contextPromise = createContext();
    globalThis.linkedInContextPromise = contextPromise;
    void contextPromise.then((context) => {
      context.on("close", () => {
        if (globalThis.linkedInContextPromise === contextPromise) globalThis.linkedInContextPromise = undefined;
      });
    }).catch(() => undefined);
  }
  try {
    return await globalThis.linkedInContextPromise;
  } catch (error) {
    globalThis.linkedInContextPromise = undefined;
    throw error;
  }
}

export async function closeLinkedInBrowser(): Promise<void> {
  const contextPromise = globalThis.linkedInContextPromise;
  if (!contextPromise) return;

  globalThis.linkedInContextPromise = undefined;
  const context = await contextPromise.catch(() => null);
  if (context) await context.close().catch(() => undefined);
}

export async function getLinkedInPage(): Promise<Page> {
  const context = await launchLinkedInBrowser();
  const existing = context.pages().find((page) => page.url().includes("linkedin.com"));
  return existing ?? context.pages()[0] ?? context.newPage();
}

export async function openLinkedIn(): Promise<void> {
  const page = await getLinkedInPage();
  await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" });
  await page.bringToFront();
}

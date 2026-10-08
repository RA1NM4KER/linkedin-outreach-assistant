import "server-only";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { findBraveExecutable } from "@/lib/linkedin/browserExecutable";

declare global {
  var linkedInContextPromise: Promise<BrowserContext> | undefined;
}

async function createContext(): Promise<BrowserContext> {
  const profileDirectory = path.join(/* turbopackIgnore: true */ process.cwd(), ".playwright-profile");
  const executablePath = findBraveExecutable();
  return chromium.launchPersistentContext(profileDirectory, {
    ...(executablePath ? { executablePath } : {}),
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

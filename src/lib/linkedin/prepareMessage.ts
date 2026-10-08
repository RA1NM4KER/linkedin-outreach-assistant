import "server-only";
import type { ElementHandle, Locator, Page } from "playwright";
import { getLinkedInPage } from "@/lib/linkedin/browser";
import { linkedInSelectors } from "@/lib/linkedin/selectors";

async function firstVisible(page: Page, selectors: readonly string[]): Promise<Locator | null> {
  for (const selector of selectors) {
    const candidates = page.locator(selector);
    const count = await candidates.count();
    for (let index = 0; index < count; index += 1) {
      const candidate = candidates.nth(index);
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }
  }
  return null;
}

async function firstVisibleWithin(root: Locator, selectors: readonly string[]): Promise<Locator | null> {
  for (const selector of selectors) {
    const candidates = root.locator(selector);
    const count = await candidates.count();
    for (let index = 0; index < count; index += 1) {
      const candidate = candidates.nth(index);
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }
  }
  return null;
}

export async function openProfile(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.bringToFront();
}

export async function openMessageComposer(page: Page): Promise<Locator> {
  const existingComposer = await firstVisible(page, linkedInSelectors.composerInputs);
  if (existingComposer) return existingComposer;

  await page.waitForLoadState("domcontentloaded");
  const messageButton = await firstVisible(page, linkedInSelectors.messageButtons);
  if (!messageButton) {
    throw new Error("Could not find a visible Message button. Confirm you are logged in and messaging is available for this profile.");
  }

  const href = await messageButton.getAttribute("href");
  const composeUrl = href ? new URL(href, page.url()) : null;
  if (composeUrl?.hostname.endsWith("linkedin.com") && composeUrl.pathname.startsWith("/messaging/compose")) {
    await page.goto(composeUrl.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
  } else {
    try {
      await messageButton.click({ timeout: 4_000 });
    } catch (error) {
      if (page.isClosed()) throw error;
      // A floating LinkedIn widget can cover the profile action. Trigger the
      // selected Message element itself instead of force-clicking its screen
      // coordinates, which could activate the covering element.
      await messageButton.evaluate((element: HTMLElement) => element.click());
    }
  }

  for (const selector of linkedInSelectors.composerInputs) {
    const candidate = page.locator(selector).last();
    try {
      await candidate.waitFor({ state: "visible", timeout: 5_000 });
      return candidate;
    } catch {
      // Try the next centralized selector.
    }
  }
  throw new Error("LinkedIn opened messaging, but the editable message field was not found.");
}

export async function fillMessage(composer: Locator, message: string): Promise<void> {
  await composer.click();
  await composer.fill(message).catch(async () => {
    await composer.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await composer.press("Backspace");
    await composer.pressSequentially(message, { delay: 1 });
  });
}

async function waitForEnabled(page: Page, button: Locator): Promise<void> {
  const handle = await button.elementHandle();
  if (!handle) throw new Error("LinkedIn's Send button disappeared before it could be clicked.");
  await page.waitForFunction(
    (element: Element) => !(element as HTMLButtonElement).disabled && element.getAttribute("aria-disabled") !== "true",
    handle,
    { timeout: 10_000 },
  );
}

async function waitForComposerToClear(page: Page, composerHandle: ElementHandle<Node>): Promise<void> {
  await page.waitForFunction(
    (element: Node) => !element.isConnected || (element.textContent ?? "").trim().length === 0,
    composerHandle,
    { timeout: 15_000 },
  );
}

export async function clickSend(page: Page, composer: Locator): Promise<void> {
  const composerHandle = await composer.elementHandle();
  if (!composerHandle) throw new Error("LinkedIn's message composer disappeared before sending.");

  const form = composer.locator("xpath=ancestor::form[1]");
  const sendButton = await firstVisibleWithin(form, linkedInSelectors.sendButtons)
    ?? await firstVisible(page, linkedInSelectors.sendButtons);
  if (!sendButton) throw new Error("Could not find LinkedIn's Send button. The interface may have changed.");

  await waitForEnabled(page, sendButton);
  await sendButton.click();
  await waitForComposerToClear(page, composerHandle).catch(() => {
    throw new Error("Send was clicked, but LinkedIn did not confirm it by clearing the composer. Check the conversation before retrying.");
  });
}

export async function prepareLinkedInMessage(linkedinUrl: string, message: string): Promise<void> {
  const page = await getLinkedInPage();
  await openProfile(page, linkedinUrl);
  const composer = await openMessageComposer(page);
  await fillMessage(composer, message);
  await page.bringToFront();
}

export async function sendLinkedInMessage(linkedinUrl: string, message: string): Promise<void> {
  const page = await getLinkedInPage();
  await openProfile(page, linkedinUrl);
  const composer = await openMessageComposer(page);
  await fillMessage(composer, message);
  const filledText = (await composer.innerText()).replaceAll("\r\n", "\n").trim();
  if (filledText !== message.replaceAll("\r\n", "\n").trim()) {
    throw new Error("LinkedIn's composer text did not match the prepared message, so Send was not clicked.");
  }
  await clickSend(page, composer);
}

export async function getComposerStatus(): Promise<{ available: boolean; empty: boolean | null }> {
  const page = await getLinkedInPage();
  const composer = await firstVisible(page, linkedInSelectors.composerInputs);
  if (!composer) return { available: false, empty: null };
  const text = (await composer.innerText()).trim();
  return { available: true, empty: text.length === 0 };
}

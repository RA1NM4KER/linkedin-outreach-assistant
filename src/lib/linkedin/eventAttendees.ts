import "server-only";
import type { Locator, Page } from "playwright";
import { canonicalizeLinkedInUrl } from "@/lib/csv";
import { closeLinkedInBrowser, getLinkedInPage } from "@/lib/linkedin/browser";
import { normalizeLinkedInEventUrl } from "@/lib/linkedin/eventUrl";
import { linkedInSelectors } from "@/lib/linkedin/selectors";
import type { EventImportStage, LinkedInAttendee } from "@/types";

export type EventImportProgress = (stage: EventImportStage, message: string, discovered: number) => void;

export { normalizeLinkedInEventUrl } from "@/lib/linkedin/eventUrl";

async function firstVisibleAction(page: Page, names: readonly RegExp[]): Promise<Locator | null> {
  for (const name of names) {
    for (const role of ["button", "link", "menuitem"] as const) {
      const matches = page.getByRole(role, { name });
      for (let index = 0; index < await matches.count(); index += 1) {
        const match = matches.nth(index);
        if (await match.isVisible().catch(() => false)) return match;
      }
    }
  }
  return null;
}

export async function openLinkedInEvent(eventUrl: string, onProgress: EventImportProgress): Promise<Page> {
  onProgress("opening-event", "Opening event…", 0);
  const page = await getLinkedInPage();
  await page.goto(eventUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.bringToFront();
  if (/\/login|\/checkpoint/i.test(page.url())) {
    throw new Error("LinkedIn needs you to log in or complete a verification step in the Playwright browser, then retry.");
  }
  return page;
}

export async function openAttendeeManager(page: Page, onProgress: EventImportProgress): Promise<void> {
  onProgress("opening-attendees", "Opening attendee list…", 0);
  let attendeeAction = await firstVisibleAction(page, linkedInSelectors.eventAttendeeDirectActions);
  if (!attendeeAction) {
    const manageAction = await firstVisibleAction(page, linkedInSelectors.eventManageActions);
    if (manageAction) {
      await manageAction.click();
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
      attendeeAction = await firstVisibleAction(page, linkedInSelectors.eventAttendeeDirectActions);
    }
  }
  if (!attendeeAction) {
    throw new Error("Could not find LinkedIn's attendee management/list action. Confirm this account is an event organizer and the attendee list is visible.");
  }
  await attendeeAction.click();
  const attendeeDialog = page
    .locator('[role="dialog"], [aria-modal="true"]')
    .filter({ hasText: /manage attendees/i })
    .last();
  await attendeeDialog.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
  if (await attendeeDialog.isVisible().catch(() => false)) {
    await attendeeDialog.locator(linkedInSelectors.eventProfileLinks).first().waitFor({ state: "attached", timeout: 15_000 });
  }
}

async function attendeeRoot(page: Page): Promise<Locator> {
  const namedDialog = page
    .locator('[role="dialog"], [aria-modal="true"]')
    .filter({ hasText: /manage attendees/i })
    .last();
  if (await namedDialog.isVisible().catch(() => false)) {
    const activePanel = namedDialog.locator('[role="tabpanel"].active:not([hidden]), [role="tabpanel"]:not([hidden])').filter({ visible: true }).last();
    if (await activePanel.count()) {
      await activePanel.locator(linkedInSelectors.eventProfileLinks).first().waitFor({ state: "attached", timeout: 15_000 });
      return activePanel;
    }
    await namedDialog.locator(linkedInSelectors.eventProfileLinks).first().waitFor({ state: "attached", timeout: 15_000 });
    return namedDialog;
  }
  for (const selector of linkedInSelectors.eventAttendeeContainers) {
    const containers = page.locator(selector);
    for (let index = (await containers.count()) - 1; index >= 0; index -= 1) {
      const container = containers.nth(index);
      if (!await container.isVisible().catch(() => false)) continue;
      if (await container.locator(linkedInSelectors.eventProfileLinks).count() > 0) return container;
    }
  }
  throw new Error("The attendee view opened, but no LinkedIn profile list was found.");
}

function cleanProfileName(value: string): string {
  return value
    .replace(/^(view|open)\s+/i, "")
    .replace(/^status is (?:online|offline)\s+/i, "")
    .replace(/[’']s\s+profile.*$/i, "")
    .replace(/\s+(?:view|open)\s+profile$/i, "")
    .replace(/\s+(?:1st|2nd|3rd)\s+degree connection(?:\s*[·•]\s*(?:1st|2nd|3rd))?.*$/i, "")
    .replace(/\s*[·•]\s*(?:1st|2nd|3rd)\+?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractVisibleAttendees(root: Locator): Promise<LinkedInAttendee[]> {
  const raw = await root.locator(linkedInSelectors.eventProfileLinks).evaluateAll((links, selectors) => links.map((node) => {
    const link = node as HTMLAnchorElement;
    const row = link.closest(selectors.rows) ?? link.parentElement;
    const fallbackNameNode = row?.querySelector(selectors.names) as HTMLElement | null;
    const fallbackName = fallbackNameNode instanceof HTMLImageElement ? fallbackNameNode.alt : fallbackNameNode?.innerText;
    const firstRowLine = (row as HTMLElement | null)?.innerText.split("\n").map((line) => line.trim()).find(Boolean);
    const firstLinkLine = link.innerText.split("\n").map((line) => line.trim()).find(Boolean);
    const name = link.getAttribute("aria-label") || firstLinkLine || link.textContent || fallbackName || firstRowLine || "";
    const headlineNodes = row ? Array.from(row.querySelectorAll(selectors.headlines)) : [];
    const headline = headlineNodes
      .map((element) => (element.textContent ?? "").replace(/\s+/g, " ").trim())
      .find((text) => text && text !== name.trim() && text.length < 300);
    const urnSource = row?.getAttribute("data-entity-urn")
      || row?.getAttribute("data-chameleon-result-urn")
      || row?.querySelector("[data-entity-urn]")?.getAttribute("data-entity-urn")
      || "";
    const memberId = urnSource.match(/(?:miniProfile|member):([^,\s]+)/i)?.[1];
    const email = (row?.querySelector('a[href^="mailto:"]') as HTMLAnchorElement | null)?.href.replace(/^mailto:/i, "");
    return { href: link.href, name, headline, memberId, email };
  }), { rows: linkedInSelectors.eventAttendeeRows, names: linkedInSelectors.eventNameCandidates, headlines: linkedInSelectors.eventHeadlineCandidates });

  const attendees = new Map<string, LinkedInAttendee>();
  for (const item of raw) {
    const linkedinUrl = canonicalizeLinkedInUrl(item.href);
    const fullName = cleanProfileName(item.name);
    if (!linkedinUrl || !fullName || fullName.length > 150) continue;
    attendees.set(linkedinUrl.toLowerCase(), {
      firstName: fullName.split(/\s+/)[0] ?? fullName,
      fullName,
      linkedinUrl,
      linkedinMemberId: item.memberId || undefined,
      headline: item.headline || undefined,
      email: item.email || undefined,
    });
  }
  return [...attendees.values()];
}

async function clickLoadMore(page: Page): Promise<boolean> {
  const action = await firstVisibleAction(page, linkedInSelectors.eventLoadMoreActions);
  if (!action || !await action.isEnabled().catch(() => false)) return false;
  await action.click();
  return true;
}

async function advanceVirtualList(root: Locator): Promise<void> {
  const lastLink = root.locator(linkedInSelectors.eventProfileLinks).last();
  if (await lastLink.count()) {
    await lastLink.evaluate((element) => {
      element.scrollIntoView({ block: "end" });
      let parent = element.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (parent.scrollHeight > parent.clientHeight && /(auto|scroll)/.test(style.overflowY)) {
          parent.scrollTop = parent.scrollHeight;
          break;
        }
        parent = parent.parentElement;
      }
    });
  }
  await root.evaluate((element) => {
    if (element.scrollHeight > element.clientHeight) element.scrollTop = element.scrollHeight;
    else window.scrollTo({ top: document.documentElement.scrollHeight });
  });
}

async function waitForAttendeeListChange(root: Locator, signature: string, timeout: number): Promise<void> {
  await root.evaluate((element, options) => new Promise<void>((resolve) => {
    const currentSignature = () => Array.from(element.querySelectorAll(options.selector))
      .map((node) => (node as HTMLAnchorElement).href)
      .join("|");
    if (currentSignature() !== options.signature) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (currentSignature() !== options.signature) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(element, { childList: true, subtree: true });
    window.setTimeout(() => {
      observer.disconnect();
      resolve();
    }, options.timeout);
  }), { selector: linkedInSelectors.eventProfileLinks, signature, timeout });
}

export async function loadAllAttendees(page: Page, onProgress: EventImportProgress): Promise<LinkedInAttendee[]> {
  const root = await attendeeRoot(page);
  const discovered = new Map<string, LinkedInAttendee>();
  let stablePasses = 0;

  for (let cycle = 0; cycle < 500 && stablePasses < 5; cycle += 1) {
    const before = discovered.size;
    for (const attendee of await extractVisibleAttendees(root)) discovered.set(attendee.linkedinUrl.toLowerCase(), attendee);
    if (discovered.size !== before) {
      stablePasses = 0;
      onProgress("loading-attendees", `${discovered.size} attendees discovered…`, discovered.size);
    } else {
      stablePasses += 1;
    }

    const visibleSignature = await root.locator(linkedInSelectors.eventProfileLinks).evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href).join("|"));
    const clicked = await clickLoadMore(page);
    await advanceVirtualList(root);
    await waitForAttendeeListChange(root, visibleSignature, clicked ? 5_000 : 2_000);
  }

  for (const attendee of await extractVisibleAttendees(root)) discovered.set(attendee.linkedinUrl.toLowerCase(), attendee);
  if (discovered.size === 0) throw new Error("No attendee profiles were exposed in LinkedIn's attendee list.");
  return [...discovered.values()];
}

export async function importEventAttendees(eventUrl: string, onProgress: EventImportProgress): Promise<LinkedInAttendee[]> {
  const normalizedUrl = normalizeLinkedInEventUrl(eventUrl);
  let page: Page | undefined;
  try {
    page = await openLinkedInEvent(normalizedUrl, onProgress);
    await openAttendeeManager(page, onProgress);
    return await loadAllAttendees(page, onProgress);
  } finally {
    if (page) await page.context().close().catch(() => undefined);
    else await closeLinkedInBrowser();
  }
}

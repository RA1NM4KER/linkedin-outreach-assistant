export const linkedInSelectors = {
  messageButtons: [
    'button:has-text("Message")',
    'a:has-text("Message")',
    '[aria-label^="Message "]',
  ],
  composerInputs: [
    'div.msg-form__contenteditable[contenteditable="true"]',
    'div[role="textbox"][contenteditable="true"][aria-label*="message" i]',
    'div[role="textbox"][contenteditable="true"]',
  ],
  sendButtons: [
    'button.msg-form__send-button',
    'button[type="submit"]:has-text("Send")',
    'button[aria-label^="Send" i]',
  ],
  eventAttendeeDirectActions: [
    /manage attendees/i,
    /registered attendees/i,
    /view attendees/i,
    /see all attendees/i,
    /^attendees(?:\s*\(.*\))?$/i,
    /^registrants(?:\s*\(.*\))?$/i,
  ],
  eventManageActions: [
    /manage event/i,
    /organizer tools/i,
    /event analytics/i,
  ],
  eventAttendeeContainers: [
    '[role="dialog"]',
    '[aria-modal="true"]',
    '[role="main"]',
    "main",
  ],
  eventProfileLinks: 'a[href*="linkedin.com/in/"], a[href^="/in/"]',
  eventAttendeeRows: 'li, article, tr, [role="listitem"]',
  eventNameCandidates: '[data-anonymize="person-name"], .artdeco-entity-lockup__title, img[alt]',
  eventHeadlineCandidates: '[data-anonymize="headline"], .artdeco-entity-lockup__subtitle, p',
  eventLoadMoreActions: [
    /load more/i,
    /show more results/i,
    /show more attendees/i,
    /see more attendees/i,
  ],
} as const;

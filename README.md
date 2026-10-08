# LinkedIn Outreach Assistant

A local tool for preparing personalized LinkedIn event follow-up messages. It stores the queue and message state locally, opens profiles in a persistent Playwright Chromium session, and supports individual preparation or a confirmed test batch capped at five messages.

## Requirements

- Node.js 20.9 or newer
- npm
- A LinkedIn account you can log into manually

## Install and run

```bash
cd linkedin-outreach-assistant
npm install
npm run playwright:install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## First-time workflow

1. Click **Open LinkedIn session**.
2. A visible Chromium window opens. Log in to LinkedIn manually. The app never asks for or stores your password.
3. Paste a LinkedIn public event URL or organizer `/event/manage/...` URL into **Sync LinkedIn event attendees**.
4. Click **Sync attendees**. The app opens the organizer view, enters **Manage event → Manage attendees**, scrolls until no new profiles appear, saves the result, and closes its temporary browser window.
5. Review the imported queue. Use the × beside a contact to permanently remove and exclude them from future imports; the app asks for confirmation first. Re-importing later adds new attendees without changing existing Sent, Prepared, or Skipped statuses.
6. Edit the reusable message template. Supported placeholders are `{firstName}` and `{fullName}`. Click **Save template**.
7. Select a contact and click **Send in LinkedIn**. The app opens the conversation, fills and verifies the message, clicks Send, confirms the composer cleared, marks the contact Sent, then closes the automated Chromium window.
8. For a bounded automatic test, click **Send 5 Test Messages** and confirm the displayed names. The app processes only those pending contacts, one at a time.
9. The test batch verifies the filled text, clicks Send, waits for the composer to clear, marks the contact Sent, and stops immediately if any step fails.
10. Review the five conversations in LinkedIn before deliberately starting another batch.

The optional **Check open composer** action reports whether the visible composer still contains text. An empty composer may mean the message was sent or cleared, so this is informational only.

## CSV formats

CSV remains available as a fallback; it is not required for the LinkedIn Event workflow.

Both header formats are supported:

```csv
name,linkedin_url
Sarah Johnson,https://www.linkedin.com/in/example
```

```csv
first_name,last_name,linkedin_url
Sarah,Johnson,https://www.linkedin.com/in/example
```

URLs are normalized and the same LinkedIn profile URL is not imported twice. Invalid rows and duplicates are reported after import.

## Local data and privacy

- Queue data is stored in `data/outreach.json`.
- Event URLs, import timestamps, attendee totals, visible attendee metadata, and per-import new/duplicate counts are stored with the local queue.
- The persistent Chromium session is stored in `.playwright-profile/`.
- Both locations are gitignored.
- LinkedIn passwords are never stored by this application. LinkedIn's own Chromium session cookies live only in the ignored browser profile.
- The app does not rely on LinkedIn retaining drafts. Every generated message and status is in the local queue.

To erase contacts, statuses, and the template, use **Clear all local data** and accept the confirmation. This does not erase the Chromium session; remove `.playwright-profile/` manually while the app is stopped if you also want to forget the LinkedIn login.

## Commands

```bash
npm run dev                 # development server
npm run typecheck           # strict TypeScript check
npm run lint                # ESLint
npm test                    # unit tests
npm run build               # production build
npm start                   # run the production build
npm run playwright:install  # install Playwright Chromium
```

## LinkedIn automation limitations

LinkedIn changes its interface and may show different layouts based on account type, connection state, locale, or experiments. Selectors are centralized in `src/lib/linkedin/selectors.ts`. The automation prefers visible Message actions and accessible/editor attributes, but profiles without messaging access will be marked failed with an actionable error. LinkedIn may also show CAPTCHAs, verification steps, or rate limits; complete those manually and retry the contact.

Event importing only reads the attendee management interface LinkedIn exposes to the logged-in organizer. It does not infer private emails, visit external sites, or bypass privacy controls. Email is stored only if the official attendee row explicitly contains a visible `mailto:` link.

Automatic sending is deliberately limited to one explicitly selected contact or a user-confirmed batch of at most five pending contacts. There is no Send All action, background run, or automatic retry. Keep the Playwright Chromium window open while a batch runs; successful single sends close it automatically.

## License

Licensed under the [MIT License](LICENSE).

import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

const sections = [
  {
    title: "1. Local-first privacy",
    paragraphs: [
      <>LinkedIn Outreach Assistant is designed to run locally. This build does not include hosted analytics, advertising trackers, or a remote application database.</>,
    ],
  },
  {
    title: "2. Data the application processes",
    paragraphs: [
      <>The application processes contact names, LinkedIn profile URLs, optional profile details, event URLs, message templates, generated messages, queue statuses, and timestamps that you import or create.</>,
      <>A Playwright browser profile retains LinkedIn session data so you can remain signed in. The application does not ask for or separately store your LinkedIn password.</>,
    ],
  },
  {
    title: "3. How data is used",
    paragraphs: [
      <>Data is used to build your local queue, personalize message previews, open the intended LinkedIn conversation, send messages you explicitly approve, and record workflow status.</>,
    ],
  },
  {
    title: "4. Storage and sharing",
    paragraphs: [
      <>Workspace data is stored in <code>data/outreach.json</code>, and browser session data is stored in <code>.playwright-profile/</code> on the machine running the application.</>,
      <>The application sends information to LinkedIn through the automated browser only when needed for an action you initiate. It does not sell contact data or send it to an application-operated analytics service.</>,
    ],
  },
  {
    title: "5. Retention and deletion",
    paragraphs: [
      <>Use “Clear all local data” to erase the local contact queue, statuses, imports, and template. This does not erase the LinkedIn browser session. To remove that session, stop the application and delete the <code>.playwright-profile/</code> directory.</>,
      <>CSV exports and repository backups are separate copies under your control and must be deleted separately.</>,
    ],
  },
  {
    title: "6. Security and third parties",
    paragraphs: [
      <>Protect access to the device and repository because local files may contain personal data and an authenticated browser session. LinkedIn processes data under its own privacy policy, which this application does not control.</>,
    ],
  },
  {
    title: "7. Changes and contact",
    paragraphs: [
      <>This policy may be updated when data practices change. The effective date above identifies the current version. Privacy questions can be raised through the project’s <a href="https://github.com/RA1NM4KER/linkedin-outreach-assistant/issues" rel="noreferrer" target="_blank">GitHub issue tracker</a>.</>,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="What stays on your device, what reaches LinkedIn, and how to delete it."
      sections={sections}
    />
  );
}

import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Use" };

const sections = [
  {
    title: "1. Using the application",
    paragraphs: [
      <>LinkedIn Outreach Assistant is a local workflow tool for reviewing contacts and sending messages through a browser session you control. By using it, you agree to these terms.</>,
      <>You must be legally permitted to use the LinkedIn account and contact data connected to the application.</>,
    ],
  },
  {
    title: "2. Your responsibilities",
    paragraphs: [
      <>You are responsible for every recipient, message, and send you approve. Use the application only for lawful, relevant outreach and honour opt-outs, privacy rights, anti-spam rules, and LinkedIn’s applicable terms and policies.</>,
      <>Do not use the application to mislead, harass, scrape unlawfully, bypass platform restrictions, or send unsolicited bulk messages.</>,
    ],
  },
  {
    title: "3. Automation and account risk",
    paragraphs: [
      <>LinkedIn can change its interface, restrict automation, request verification, or limit an account. The application cannot guarantee message delivery, platform availability, or that LinkedIn will permit a particular workflow.</>,
      <>Review your queue, template, and recipient before sending. Sent messages cannot be recalled by this application.</>,
    ],
  },
  {
    title: "4. Local data and third-party services",
    paragraphs: [
      <>The application stores workspace data and its automated browser profile on the device where it runs. LinkedIn is a separate third-party service with its own terms and privacy practices.</>,
      <>This project is independent and is not affiliated with, endorsed by, or sponsored by LinkedIn Corporation.</>,
    ],
  },
  {
    title: "5. Availability and warranties",
    paragraphs: [
      <>The application is provided “as is” and “as available.” To the extent permitted by law, no warranty is made that it will be uninterrupted, error-free, or suitable for a particular purpose.</>,
    ],
  },
  {
    title: "6. Limitation of liability",
    paragraphs: [
      <>To the extent permitted by law, the project’s maintainers are not liable for indirect or consequential loss, lost opportunities, account restrictions, or actions taken through your LinkedIn account. Nothing here excludes liability that cannot legally be excluded.</>,
    ],
  },
  {
    title: "7. Changes and contact",
    paragraphs: [
      <>These terms may be updated as the application changes. The effective date above identifies the current version. Questions can be raised through the project’s <a href="https://github.com/RA1NM4KER/linkedin-outreach-assistant/issues" rel="noreferrer" target="_blank">GitHub issue tracker</a>.</>,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Use"
      intro="Clear rules for using LinkedIn Outreach Assistant responsibly."
      sections={sections}
    />
  );
}

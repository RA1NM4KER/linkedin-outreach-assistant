import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

interface LegalSection {
  title: string;
  paragraphs: React.ReactNode[];
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}

export function LegalPage({ eyebrow, title, intro, sections }: LegalPageProps) {
  return (
    <main className="legal-shell">
      <nav className="legal-nav" aria-label="Legal navigation">
        <Link className="legal-brand" href="/">
          <BrandMark />
          <span>LinkedIn Outreach</span>
        </Link>
        <Link className="button secondary compact" href="/">Back to dashboard</Link>
      </nav>

      <article className="legal-card">
        <header className="legal-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
          <small>Effective 8 October 2026</small>
        </header>

        <div className="legal-content">
          {sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </section>
          ))}
        </div>
      </article>

      <footer className="legal-footer">
        <span>LinkedIn Outreach Assistant</span>
        <span>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="https://github.com/RA1NM4KER/linkedin-outreach-assistant/blob/main/LICENSE" rel="noreferrer" target="_blank">MIT License</a>
        </span>
      </footer>
    </main>
  );
}

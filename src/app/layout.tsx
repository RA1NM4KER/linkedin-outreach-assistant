import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LinkedIn Outreach — Campaign Workspace", template: "%s | LinkedIn Outreach" },
  description: "Review contacts and send personalized LinkedIn outreach locally.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

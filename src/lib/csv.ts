import type { Contact } from "@/types";

export interface NormalizedCsvContact {
  firstName: string;
  fullName: string;
  linkedinUrl: string;
}

export interface CsvParseResult {
  contacts: NormalizedCsvContact[];
  invalid: number;
  errors: string[];
}

export function deduplicateByLinkedInUrl<T extends { linkedinUrl: string }>(items: T[], existingUrls: Iterable<string> = []): { unique: T[]; duplicates: number } {
  const seen = new Set(Array.from(existingUrls, (url) => url.toLowerCase()));
  const unique: T[] = [];
  let duplicates = 0;
  for (const item of items) {
    const key = item.linkedinUrl.toLowerCase();
    if (seen.has(key)) {
      duplicates += 1;
    } else {
      seen.add(key);
      unique.push(item);
    }
  }
  return { unique, duplicates };
}

export function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field.trim());
      field = "";
    } else if (character === "\n") {
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizedHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function canonicalizeLinkedInUrl(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    const url = new URL(withProtocol);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname !== "linkedin.com") return null;
    const profileMatch = url.pathname.match(/^\/in\/([^/]+)\/?$/i);
    if (!profileMatch) return null;
    return `https://www.linkedin.com/in/${profileMatch[1]}`;
  } catch {
    return null;
  }
}

export function parseAndNormalizeCsv(input: string): CsvParseResult {
  const rows = parseCsvRows(input.replace(/^\uFEFF/, ""));
  if (rows.length === 0) return { contacts: [], invalid: 0, errors: ["The CSV is empty."] };

  const headers = rows[0].map(normalizedHeader);
  const nameIndex = headers.indexOf("name");
  const firstIndex = headers.indexOf("first_name");
  const lastIndex = headers.indexOf("last_name");
  const urlIndex = headers.indexOf("linkedin_url");
  if (urlIndex < 0 || (nameIndex < 0 && firstIndex < 0)) {
    return {
      contacts: [],
      invalid: Math.max(rows.length - 1, 0),
      errors: ["CSV headers must be name,linkedin_url or first_name,last_name,linkedin_url."],
    };
  }

  const contacts: NormalizedCsvContact[] = [];
  const errors: string[] = [];
  let invalid = 0;
  rows.slice(1).forEach((row, offset) => {
    const line = offset + 2;
    const fullName = nameIndex >= 0
      ? (row[nameIndex] ?? "").trim()
      : [row[firstIndex] ?? "", lastIndex >= 0 ? row[lastIndex] ?? "" : ""].map((part) => part.trim()).filter(Boolean).join(" ");
    const firstName = firstIndex >= 0 ? (row[firstIndex] ?? "").trim() : fullName.split(/\s+/)[0] ?? "";
    const linkedinUrl = canonicalizeLinkedInUrl(row[urlIndex] ?? "");
    if (!fullName || !firstName || !linkedinUrl) {
      invalid += 1;
      errors.push(`Line ${line}: missing a valid name or LinkedIn /in/ URL.`);
      return;
    }
    contacts.push({ firstName, fullName, linkedinUrl });
  });

  return { contacts, invalid, errors };
}

function escapeCsv(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function contactsToCsv(contacts: Contact[]): string {
  const headers = ["first_name", "full_name", "linkedin_url", "linkedin_member_id", "headline", "email", "source_event_urls", "status", "message", "error", "updated_at"];
  const body = contacts.map((contact) => [
    contact.firstName,
    contact.fullName,
    contact.linkedinUrl,
    contact.linkedinMemberId,
    contact.headline,
    contact.email,
    contact.sourceEventUrls?.join(" | "),
    contact.status,
    contact.message,
    contact.error,
    contact.updatedAt,
  ].map((value) => escapeCsv(value ?? "")).join(","));
  return [headers.join(","), ...body].join("\n");
}

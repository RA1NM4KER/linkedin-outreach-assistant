export function normalizeMessageText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

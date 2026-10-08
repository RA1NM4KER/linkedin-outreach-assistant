import { describe, expect, it } from "vitest";
import { normalizeMessageText } from "@/lib/linkedin/messageText";

describe("normalizeMessageText", () => {
  it("ignores rich-editor whitespace and invisible characters", () => {
    const expected = "Hi Corne!\n\nJoin us at https://qkt.io/IvSz9C";
    const linkedInText = "\u200BHi\u00a0Corne!\r\n\r\n\r\nJoin us at https://qkt.io/IvSz9C\uFEFF\n";

    expect(normalizeMessageText(linkedInText)).toBe(normalizeMessageText(expected));
  });

  it("preserves visible character differences", () => {
    expect(normalizeMessageText("Hi Corne! Visit link A"))
      .not.toBe(normalizeMessageText("Hi Corne! Visit link B"));
  });
});

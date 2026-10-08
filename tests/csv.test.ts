import { describe, expect, it } from "vitest";
import { canonicalizeLinkedInUrl, deduplicateByLinkedInUrl, parseAndNormalizeCsv } from "@/lib/csv";

describe("CSV normalization", () => {
  it("supports name,linkedin_url and quoted names", () => {
    const result = parseAndNormalizeCsv('name,linkedin_url\n"Johnson, Sarah",https://www.linkedin.com/in/sarah-j/?trk=event');
    expect(result.invalid).toBe(0);
    expect(result.contacts).toEqual([{ firstName: "Johnson,", fullName: "Johnson, Sarah", linkedinUrl: "https://www.linkedin.com/in/sarah-j" }]);
  });

  it("supports separate first and last name columns", () => {
    const result = parseAndNormalizeCsv("first_name,last_name,linkedin_url\nChipo,Moyo,linkedin.com/in/chipo-moyo/");
    expect(result.contacts[0]).toEqual({ firstName: "Chipo", fullName: "Chipo Moyo", linkedinUrl: "https://www.linkedin.com/in/chipo-moyo" });
  });

  it("rejects non-profile URLs", () => {
    expect(canonicalizeLinkedInUrl("https://example.com/in/person")).toBeNull();
    expect(parseAndNormalizeCsv("name,linkedin_url\nBad,https://linkedin.com/company/acme").invalid).toBe(1);
  });
});

describe("duplicate detection", () => {
  it("drops duplicates in the import and those already stored", () => {
    const items = [
      { linkedinUrl: "https://www.linkedin.com/in/sarah", name: "Sarah" },
      { linkedinUrl: "https://www.linkedin.com/in/sarah", name: "Sarah duplicate" },
      { linkedinUrl: "https://www.linkedin.com/in/michael", name: "Michael" },
    ];
    const result = deduplicateByLinkedInUrl(items, ["https://www.linkedin.com/in/michael"]);
    expect(result.duplicates).toBe(2);
    expect(result.unique.map((item) => item.name)).toEqual(["Sarah"]);
  });
});

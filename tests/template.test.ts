import { describe, expect, it } from "vitest";
import { interpolateTemplate } from "@/lib/template";

describe("interpolateTemplate", () => {
  it("replaces every supported placeholder", () => {
    expect(interpolateTemplate("Hi {firstName}! {fullName} / {firstName}", { firstName: "Sarah", fullName: "Sarah Johnson" }))
      .toBe("Hi Sarah! Sarah Johnson / Sarah");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(interpolateTemplate("Hi {firstName} from {company}", { firstName: "Sarah", fullName: "Sarah Johnson" }))
      .toBe("Hi Sarah from {company}");
  });
});

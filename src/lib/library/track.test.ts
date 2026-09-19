import { describe, expect, it } from "vitest";
import { formatDuration, normaliseTitle } from "@/lib/library/track";

describe("normaliseTitle", () => {
  it("collapses remaster and edit variants onto the same key", () => {
    const base = normaliseTitle("Heroes");

    expect(normaliseTitle("Heroes - 2017 Remaster")).toBe(base);
    expect(normaliseTitle("Heroes - Radio Edit")).toBe(base);
    expect(normaliseTitle("Heroes - Live")).toBe(base);
  });

  it("strips featured-artist parentheses", () => {
    expect(normaliseTitle("Stay (feat. Justin Bieber)")).toBe("stay");
    expect(normaliseTitle("Stay (with Someone)")).toBe("stay");
  });

  it("removes diacritics so Polish titles match", () => {
    expect(normaliseTitle("Zażółć gęślą jaźń")).toBe("zazolc gesla jazn");
  });

  it("does not merge genuinely different songs", () => {
    expect(normaliseTitle("Heroes")).not.toBe(normaliseTitle("Heroine"));
  });
});

describe("formatDuration", () => {
  it("pads seconds", () => {
    expect(formatDuration(243_000)).toBe("4:03");
    expect(formatDuration(600_000)).toBe("10:00");
    expect(formatDuration(59_000)).toBe("0:59");
  });
});

import { describe, expect, it } from "vitest";
import { extractLyricsSignalsForTest as extractSignals } from "@/lib/enrichment/lyrics";

describe("lyrics signal extraction", () => {
  it("keeps only thematic words, dropping function words", () => {
    const signals = extractSignals("I am running in the night and the night is running with me");

    expect(signals.hasLyrics).toBe(true);
    expect(signals.keywords).toContain("running");
    expect(signals.keywords).toContain("night");
    /* "the", "and", "with" are stop words in both supported languages. */
    expect(signals.keywords).not.toContain("the");
    expect(signals.keywords).not.toContain("and");
  });

  it("scores a repetitive chorus as low-variety", () => {
    const repetitive = extractSignals("dance dance dance dance dance dance dance dance");
    const varied = extractSignals("winter harbour lantern quiet morning distant railway signal");

    expect(repetitive.uniqueWordRatio).toBeLessThan(varied.uniqueWordRatio);
  });

  it("handles Polish diacritics without mangling words", () => {
    const signals = extractSignals("tęsknota za latem, tęsknota za ciepłem, żółte światło");

    expect(signals.keywords).toContain("tęsknota");
    expect(signals.keywords).toContain("żółte");
  });

  it("reports empty input as having no lyrics", () => {
    expect(extractSignals("   ").hasLyrics).toBe(false);
  });

  it("caps keywords at eight", () => {
    const many = [
      "harbour",
      "lantern",
      "winter",
      "railway",
      "signal",
      "distant",
      "morning",
      "meadow",
      "thunder",
      "copper",
      "orchard",
      "velvet",
    ].join(" ");

    expect(extractSignals(many).keywords).toHaveLength(8);
  });

  it("strips digits, so numbers never become keywords", () => {
    const signals = extractSignals("2024 was the year of thunder 999 thunder");

    expect(signals.keywords).toContain("thunder");
    expect(signals.keywords.some((word) => /\d/.test(word))).toBe(false);
  });
});

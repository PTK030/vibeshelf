import { describe, expect, it } from "vitest";
import { buildInsights } from "@/features/library/insights";

const base = { likedTotal: 100, playlistTotal: 10, topArtistNames: [], topArtistGenres: [] };

describe("buildInsights", () => {
  it("calls out a concentrated taste", () => {
    const insights = buildInsights({
      ...base,
      topArtistGenres: [["techno"], ["deep house"], ["tech house"], ["ambient techno"]],
    });

    expect(insights.some((i) => i.title === "Masz wyraźny rdzeń")).toBe(true);
  });

  it("calls out a broad taste instead", () => {
    const insights = buildInsights({
      ...base,
      topArtistGenres: [["techno"], ["boom bap"], ["bebop"], ["black metal"]],
    });

    expect(insights.some((i) => i.title === "Słuchasz szeroko")).toBe(true);
  });

  it("flags a large library with few playlists", () => {
    const insights = buildInsights({ ...base, likedTotal: 800, playlistTotal: 3 });

    expect(insights.some((i) => i.tone === "warning")).toBe(true);
  });

  it("does not flag a library that is already well organised", () => {
    const insights = buildInsights({ ...base, likedTotal: 300, playlistTotal: 40 });

    expect(insights.some((i) => i.tone === "warning")).toBe(false);
  });

  it("survives an account with no history at all", () => {
    expect(() => buildInsights({ ...base, likedTotal: 0, playlistTotal: 0 })).not.toThrow();
  });
});

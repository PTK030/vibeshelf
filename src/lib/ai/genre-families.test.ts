import { describe, expect, it } from "vitest";
import { UNKNOWN_FAMILY, genreFamily } from "@/lib/ai/genre-families";

describe("genreFamily", () => {
  it("maps micro-genres onto their family", () => {
    expect(genreFamily(["melodic dubstep"])).toBe("electronic");
    expect(genreFamily(["chamber psych", "indie rock"])).toBe("rock");
    expect(genreFamily(["boom bap"])).toBe("hiphop");
    expect(genreFamily(["neoclassical darkwave"])).toBe("classical");
  });

  it("falls back to unknown when nothing matches", () => {
    expect(genreFamily([])).toBe(UNKNOWN_FAMILY);
    expect(genreFamily(["zzz unclassifiable"])).toBe(UNKNOWN_FAMILY);
  });

  it("ignores case", () => {
    expect(genreFamily(["Techno"])).toBe("electronic");
  });
});

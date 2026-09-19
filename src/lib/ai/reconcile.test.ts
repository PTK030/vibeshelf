import { describe, expect, it } from "vitest";
import { MISS_SLUGS_FIXTURE } from "@/lib/ai/reconcile.fixture";
import { needsRepairPass, reconcileChunk } from "@/lib/ai/reconcile";
import { MISC_SLUG } from "@/lib/ai/schemas";

const SLUGS = ["run", "focus", "melanch"] as const;

describe("reconcileChunk", () => {
  it("assigns every index in the chunk, even when the model skips some", () => {
    const result = reconcileChunk({
      chunkSize: 5,
      slugs: SLUGS,
      buckets: [{ category: "run", tracks: [0, 1] }],
    });

    expect(result.assignments.size).toBe(5);
    expect(result.assignments.get(0)).toBe("run");
    expect(result.assignments.get(4)).toBe(MISC_SLUG);
    expect(result.stats.missing).toBe(3);
  });

  it("drops indices outside the chunk instead of trusting them", () => {
    const result = reconcileChunk({
      chunkSize: 3,
      slugs: SLUGS,
      buckets: [{ category: "run", tracks: [0, 7, -1, 2.5] }],
    });

    expect(result.stats.hallucinatedIndices).toBe(3);
    expect(result.assignments.get(0)).toBe("run");
    expect([...result.assignments.keys()].every((index) => index < 3)).toBe(true);
  });

  it("resolves a double assignment toward the earlier taxonomy entry", () => {
    const result = reconcileChunk({
      chunkSize: 2,
      slugs: SLUGS,
      buckets: [
        { category: "melanch", tracks: [0] },
        { category: "run", tracks: [0] },
      ],
    });

    expect(result.assignments.get(0)).toBe("run");
    expect(result.stats.duplicateAssignments).toBe(1);
  });

  it("is deterministic regardless of bucket order", () => {
    const forward = reconcileChunk({
      chunkSize: 2,
      slugs: SLUGS,
      buckets: [
        { category: "run", tracks: [0] },
        { category: "melanch", tracks: [0] },
      ],
    });

    expect(forward.assignments.get(0)).toBe("run");
  });

  it("repairs a near-miss category a provider produced off-enum", () => {
    const result = reconcileChunk({
      chunkSize: 1,
      slugs: SLUGS,
      buckets: [{ category: "Focus", tracks: [0] }],
    });

    expect(result.assignments.get(0)).toBe("focus");
  });

  it("discards a category too far from anything real", () => {
    const result = reconcileChunk({
      chunkSize: 1,
      slugs: SLUGS,
      buckets: [{ category: MISS_SLUGS_FIXTURE, tracks: [0] }],
    });

    expect(result.stats.unknownCategories).toBe(1);
    expect(result.assignments.get(0)).toBe(MISC_SLUG);
  });

  it("keeps only in-range low-confidence indices", () => {
    const result = reconcileChunk({
      chunkSize: 3,
      slugs: SLUGS,
      buckets: [{ category: "run", tracks: [0, 1, 2] }],
      lowConfidence: [1, 99],
    });

    expect([...result.lowConfidence]).toEqual([1]);
  });
});

describe("needsRepairPass", () => {
  it("asks for a repair pass only past the 10% threshold", () => {
    expect(needsRepairPass({ ...EMPTY_STATS, missing: 5 }, 100)).toBe(false);
    expect(needsRepairPass({ ...EMPTY_STATS, missing: 20 }, 100)).toBe(true);
  });

  it("never divides by zero on an empty chunk", () => {
    expect(needsRepairPass({ ...EMPTY_STATS, missing: 0 }, 0)).toBe(false);
  });
});

const EMPTY_STATS = {
  hallucinatedIndices: 0,
  duplicateAssignments: 0,
  unknownCategories: 0,
  repairedCategories: 0,
  missing: 0,
};

import { describe, expect, it } from "vitest";
import { maskKey } from "@/lib/ai/mask-key";

describe("maskKey", () => {
  it("keeps the vendor prefix and the last four characters", () => {
    const masked = maskKey("sk-or-v1-abcdefghijklmnopqrstuvwxyz1234");

    expect(masked.startsWith("sk-or-v1-")).toBe(true);
    expect(masked.endsWith("1234")).toBe(true);
  });

  it("never leaks the middle of the key", () => {
    const key = "sk-ant-api03-SECRETMIDDLEPART-9876";

    expect(maskKey(key)).not.toContain("SECRETMIDDLEPART");
  });

  it("handles each vendor prefix", () => {
    expect(maskKey("sk-ant-0123456789abcdef").startsWith("sk-ant-")).toBe(true);
    expect(maskKey("sk-proj-0123456789abcdef").startsWith("sk-proj-")).toBe(true);
    expect(maskKey("sk-0123456789abcdef").startsWith("sk-")).toBe(true);
  });

  it("reveals nothing at all for an implausibly short key", () => {
    expect(maskKey("short")).toBe("••••••••");
  });
});

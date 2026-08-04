import { describe, expect, it } from "vitest";
import { newWalkId } from "../id";

describe("newWalkId", () => {
  it("10,000 rapid successive ids are all unique (the prototype's Date.now() ids collided within a millisecond)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) seen.add(newWalkId());
    expect(seen.size).toBe(10_000);
  });

  it("ids are non-empty and w-prefixed, so they can never collide with a stringified legacy numeric id", () => {
    for (let i = 0; i < 100; i++) {
      expect(newWalkId()).toMatch(/^w./);
    }
  });
});

import { describe, expect, it } from "vitest";
import { MOONS, moonOf } from "../moon";

describe("moonOf — the four verified eclipse dates from the spec", () => {
  it("2000-01-06 was a new moon (the reference anchor)", () => {
    expect(moonOf("2000-01-06").name).toBe("New moon");
  });

  it("2000-01-21 was a full moon (total lunar eclipse)", () => {
    expect(moonOf("2000-01-21").name).toBe("Full moon");
  });

  it("2024-04-08 was a new moon (total solar eclipse over North America)", () => {
    expect(moonOf("2024-04-08").name).toBe("New moon");
  });

  it("2025-03-14 was a full moon (total lunar eclipse)", () => {
    expect(moonOf("2025-03-14").name).toBe("Full moon");
  });
});

describe("moonOf — behavior", () => {
  it("defaults to new moon for missing input", () => {
    expect(moonOf("")).toBe(MOONS[0]);
    expect(moonOf(null)).toBe(MOONS[0]);
    expect(moonOf(undefined)).toBe(MOONS[0]);
  });

  it("always returns one of the eight phases", () => {
    // sweep a month to make sure the index math never escapes 0..7
    for (let day = 1; day <= 31; day++) {
      const iso = `2026-08-${String(day).padStart(2, "0")}`;
      expect(MOONS).toContain(moonOf(iso));
    }
  });

  it("moves through a waxing sequence after a new moon", () => {
    // 2024-04-08 new → about a week later should be around first quarter
    expect(moonOf("2024-04-15").name).toBe("First quarter");
    // about two weeks later should be full
    expect(moonOf("2024-04-23").name).toBe("Full moon");
  });
});

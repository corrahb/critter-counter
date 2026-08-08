import { describe, expect, it, vi } from "vitest";
import { duskPhase, sunsetAt, sunsetHHMM } from "../sun";

/* TZ is pinned to America/Toronto in vite.config.ts */
const TORONTO = { lat: 43.65, lon: -79.38 };

const localMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

describe("sunsetAt — sanity against published values (±10 min)", () => {
  it("Toronto summer solstice sunset ≈ 9:03 pm EDT", () => {
    const s = sunsetAt(TORONTO.lat, TORONTO.lon, "2026-06-20");
    expect(s).not.toBeNull();
    expect(localMinutes(s!)).toBeGreaterThan(20 * 60 + 53); // after 8:53 pm
    expect(localMinutes(s!)).toBeLessThan(21 * 60 + 13); // before 9:13 pm
  });

  it("Toronto winter solstice sunset ≈ 4:43 pm EST", () => {
    const s = sunsetAt(TORONTO.lat, TORONTO.lon, "2026-12-21");
    expect(s).not.toBeNull();
    expect(localMinutes(s!)).toBeGreaterThan(16 * 60 + 33);
    expect(localMinutes(s!)).toBeLessThan(16 * 60 + 53);
  });

  it("Toronto equinox sunset ≈ 7:20 pm EDT", () => {
    const s = sunsetAt(TORONTO.lat, TORONTO.lon, "2026-09-22");
    expect(s).not.toBeNull();
    expect(localMinutes(s!)).toBeGreaterThan(19 * 60 + 5);
    expect(localMinutes(s!)).toBeLessThan(19 * 60 + 30);
  });

  it("Greenwich equinox sunset ≈ 18:00 UTC", () => {
    const s = sunsetAt(51.48, 0, "2026-03-20");
    expect(s).not.toBeNull();
    const utcMin = s!.getUTCHours() * 60 + s!.getUTCMinutes();
    expect(utcMin).toBeGreaterThan(17 * 60 + 45);
    expect(utcMin).toBeLessThan(18 * 60 + 25);
  });
});

describe("sunsetAt — polar honesty", () => {
  it("returns null during Svalbard's midnight sun (never sets)", () => {
    expect(sunsetAt(78.2, 15.6, "2026-06-20")).toBeNull();
  });

  it("returns null during Svalbard's polar night (never rises)", () => {
    expect(sunsetAt(78.2, 15.6, "2026-12-21")).toBeNull();
  });

  it("garbage dates return null instead of NaN", () => {
    expect(sunsetAt(43, -79, "")).toBeNull();
    expect(sunsetAt(43, -79, "not-a-date")).toBeNull();
  });
});

describe("sunsetHHMM", () => {
  it("formats as HH:MM", () => {
    expect(sunsetHHMM(TORONTO.lat, TORONTO.lon, "2026-06-20")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("null where there is no sunset", () => {
    expect(sunsetHHMM(78.2, 15.6, "2026-06-20")).toBeNull();
  });
});

describe("duskPhase — prime critter hours run sunset−1h to sunset+2h", () => {
  const sunset = new Date("2026-08-08T00:30:00Z"); // 8:30 pm EDT

  it("well before sunset", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-08-07T22:00:00Z")); // 6:00 pm
      expect(duskPhase(sunset)).toBe("before");
    } finally {
      vi.useRealTimers();
    }
  });

  it("the golden hour before", () => {
    expect(duskPhase(sunset, new Date("2026-08-07T23:45:00Z"))).toBe("prime");
  });

  it("shortly after sunset", () => {
    expect(duskPhase(sunset, new Date("2026-08-08T01:30:00Z"))).toBe("prime");
  });

  it("deep night", () => {
    expect(duskPhase(sunset, new Date("2026-08-08T03:00:00Z"))).toBe("after");
  });
});

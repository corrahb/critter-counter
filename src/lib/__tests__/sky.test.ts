import { describe, expect, it } from "vitest";
import { INK, dayBlend, mix3, mixHex, phaseOf, sceneFor } from "../sky";

describe("mixHex", () => {
  it("interpolates channel-wise", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#1E4232", "#1E4232", 0.7)).toBe("#1e4232");
  });

  it("clamps t", () => {
    expect(mixHex("#102030", "#ffffff", -1)).toBe("#102030");
    expect(mixHex("#102030", "#ffffff", 5)).toBe("#ffffff");
  });
});

describe("mix3", () => {
  it("walks day→dusk→night across [0..2]", () => {
    expect(mix3("#000000", "#808080", "#ffffff", 0)).toBe("#000000");
    expect(mix3("#000000", "#808080", "#ffffff", 1)).toBe("#808080");
    expect(mix3("#000000", "#808080", "#ffffff", 2)).toBe("#ffffff");
    expect(mix3("#000000", "#808080", "#ffffff", 0.5)).toBe("#404040");
  });
});

describe("dayBlend — with a real sunset", () => {
  const sunset = new Date(2026, 7, 7, 20, 30); // 8:30 pm local

  const at = (h: number, m: number) => new Date(2026, 7, 7, h, m);

  it("full day well before sunset", () => {
    expect(dayBlend("summer", sunset, at(14, 0))).toBe(0);
    expect(dayBlend("summer", sunset, at(19, 0))).toBe(0); // exactly -90
  });

  it("slides through the golden 90 minutes", () => {
    expect(dayBlend("summer", sunset, at(19, 45))).toBeCloseTo(0.5, 5);
    expect(dayBlend("summer", sunset, at(20, 30))).toBe(1);
  });

  it("slides dusk→night over the hour after", () => {
    expect(dayBlend("summer", sunset, at(21, 0))).toBeCloseTo(1.5, 5);
    expect(dayBlend("summer", sunset, at(21, 30))).toBe(2);
    expect(dayBlend("summer", sunset, at(23, 0))).toBe(2);
  });

  it("stays night past midnight instead of snapping back to day", () => {
    expect(dayBlend("summer", sunset, new Date(2026, 7, 8, 0, 30))).toBe(2);
    expect(dayBlend("summer", sunset, new Date(2026, 7, 8, 2, 0))).toBe(2);
  });

  it("is monotonic over an evening walk", () => {
    let prev = -1;
    for (let m = 18 * 60; m <= 22 * 60; m += 10) {
      const t = dayBlend("summer", sunset, at(Math.floor(m / 60), m % 60));
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });
});

describe("dayBlend — sunset after local midnight (high latitudes)", () => {
  // Reykjavik-like: sunset at 00:04 local the next day
  const lateSunset = new Date(2026, 5, 21, 0, 4);

  it("the bright evening before a past-midnight sunset is day, not night", () => {
    expect(dayBlend("summer", lateSunset, new Date(2026, 5, 20, 21, 0))).toBe(0);
  });

  it("approaches sunset smoothly instead of snapping night→golden at midnight", () => {
    const t2330 = dayBlend("summer", lateSunset, new Date(2026, 5, 20, 23, 30));
    const t0000 = dayBlend("summer", lateSunset, new Date(2026, 5, 21, 0, 0));
    const t0004 = dayBlend("summer", lateSunset, new Date(2026, 5, 21, 0, 4));
    expect(t2330).toBeGreaterThan(0);
    expect(t2330).toBeLessThan(t0000);
    expect(t0000).toBeLessThan(t0004);
    expect(t0004).toBe(1);
  });
});

describe("dayBlend — season fallback without location", () => {
  it("winter evenings are dark by 6 pm, summer ones aren't", () => {
    const six = new Date(2026, 0, 10, 18, 0);
    expect(dayBlend("winter", null, six)).toBe(2); // sunset ~5 pm
    expect(dayBlend("summer", null, six)).toBe(0); // sunset ~8:45 pm
  });
});

describe("phaseOf", () => {
  it("names the bands", () => {
    expect(phaseOf(0)).toBe("day");
    expect(phaseOf(0.5)).toBe("golden");
    expect(phaseOf(1.2)).toBe("dusk");
    expect(phaseOf(1.8)).toBe("night");
  });
});

describe("sceneFor — the two text regimes flip exactly once, at dusk", () => {
  it("daylight is the light regime: ink text, sun out, no fireflies or stars", () => {
    const s = sceneFor("summer", 0, null);
    expect(s.light).toBe(true);
    expect(s.textPrimary).toBe(INK);
    expect(s.textEyebrow).toBe(INK);
    expect(s.sun).toBe(true);
    expect(s.moon).toBe(false);
    expect(s.stars).toBe(false);
    expect(s.count).toBe(0); // summer fireflies keep firefly hours
  });

  it("dusk falls at blend 0.5: dark regime, cream text", () => {
    const before = sceneFor("summer", 0.49, null);
    const after = sceneFor("summer", 0.5, null);
    expect(before.light).toBe(true);
    expect(after.light).toBe(false);
    expect(after.textPrimary).toBe("#F0EBDA");
    expect(after.textEyebrow).toBe("#A9C5B4");
    expect(after.sun).toBe(false);
  });

  it("clear nights get moon and stars; cloudy nights get neither", () => {
    const clear = sceneFor("summer", 2, null);
    expect(clear.moon).toBe(true);
    expect(clear.stars).toBe(true);
    const cloudy = sceneFor("summer", 2, "cloudy");
    expect(cloudy.moon).toBe(false);
    expect(cloudy.stars).toBe(false);
  });

  it("weather overrides work in both regimes", () => {
    expect(sceneFor("summer", 0, "rain").kind).toBe("rain");
    expect(sceneFor("summer", 2, "rain").kind).toBe("rain");
    expect(sceneFor("spring", 0, "snow").kind).toBe("snow");
    expect(sceneFor("autumn", 1.9, "windy").windy).toBe(true);
  });

  it("day and dusk skies are actually different (the whole point)", () => {
    const day = sceneFor("summer", 0, null);
    const dusk = sceneFor("summer", 1, null);
    expect(day.sky).not.toBe(dusk.sky);
    // and dramatically so: the day sky is light, the dusk sky dark
    const lum = (h: string) =>
      [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).reduce((a, b) => a + b, 0);
    expect(lum(day.sky)).toBeGreaterThan(lum(dusk.sky) * 2);
  });
});

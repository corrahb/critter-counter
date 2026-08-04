import { describe, expect, it } from "vitest";
import { computeStats, sum } from "../stats";
import type { Walk } from "../../types";

const walk = (over: Partial<Walk> = {}): Walk => ({
  id: Math.random().toString(36).slice(2),
  date: "2026-08-01",
  counts: {},
  road: 0,
  duration: null,
  time: null,
  endTime: null,
  weather: null,
  note: "",
  ...over,
});

describe("sum", () => {
  it("adds numeric values, tolerating null/undefined", () => {
    expect(sum({ a: 1, b: 2 })).toBe(3);
    expect(sum({})).toBe(0);
    expect(sum(null)).toBe(0);
    expect(sum(undefined)).toBe(0);
  });
});

describe("computeStats", () => {
  const walks: Walk[] = [
    walk({
      id: "w1",
      date: "2026-08-01",
      counts: { rabbit: 7, cat: 1 },
      road: 4,
      duration: 60,
      time: "20:00",
      weather: "clear",
    }),
    walk({
      id: "w2",
      date: "2026-08-02",
      counts: { rabbit: 11 },
      road: 11,
      duration: 90,
      time: "19:15",
      weather: "clear",
    }),
    walk({
      id: "w3",
      date: "2026-08-03",
      counts: { rabbit: 2, turkey: 2 },
      road: 0,
      duration: null,
      time: "20:30",
      weather: "rain",
    }),
  ];

  const stats = computeStats(walks);

  it("totals critters and minutes", () => {
    expect(stats.totalCritters).toBe(23);
    expect(stats.totalMins).toBe(150);
  });

  it("aggregates per species", () => {
    expect(stats.perSpecies).toEqual({ rabbit: 20, cat: 1, turkey: 2 });
    expect(stats.rab).toBe(20);
  });

  it("finds the busiest walk", () => {
    expect(stats.best?.id).toBe("w2");
  });

  it("Bunny Road: total, nights, best night", () => {
    expect(stats.roadTotal).toBe(15);
    expect(stats.roadNights).toBe(2);
    expect(stats.bestRoad?.id).toBe("w2");
  });

  it("hour rows: averaged, sorted by hour, only walks with times", () => {
    expect(stats.hourRows).toEqual([
      { h: 19, avg: 11, n: 1 },
      { h: 20, avg: 6, n: 2 }, // (8 + 4) / 2
    ]);
  });

  it("weather rows: sorted by average descending", () => {
    expect(stats.weatherRows.map((r) => r.id)).toEqual(["clear", "rain"]);
    expect(stats.weatherRows[0]).toMatchObject({ id: "clear", avg: 9.5, n: 2 });
    expect(stats.weatherRows[1]).toMatchObject({ id: "rain", avg: 4, n: 1 });
  });

  it("handles an empty log without dividing by zero", () => {
    const empty = computeStats([]);
    expect(empty.totalCritters).toBe(0);
    expect(empty.best).toBeNull();
    expect(empty.bestRoad).toBeNull();
    expect(empty.hourRows).toEqual([]);
    expect(empty.weatherRows).toEqual([]);
  });

  it("a walk with road but no critters still counts as a road night", () => {
    const s = computeStats([walk({ road: 3 })]);
    expect(s.roadNights).toBe(1);
    expect(s.roadTotal).toBe(3);
    expect(s.totalCritters).toBe(0);
  });

  it("best/bestRoad ties go to the NEWEST walk (first in date-desc order), matching the prototype", () => {
    const tied = [
      walk({ id: "newest", date: "2026-08-03", counts: { rabbit: 5 }, road: 7 }),
      walk({ id: "older", date: "2026-08-02", counts: { cat: 5 }, road: 7 }),
    ];
    const s = computeStats(tied);
    expect(s.best?.id).toBe("newest");
    expect(s.bestRoad?.id).toBe("newest");
  });

  it("equal weather averages keep first-occurrence order (stable sort)", () => {
    const s = computeStats([
      walk({ id: "a", counts: { rabbit: 5 }, weather: "clear", time: "20:00" }),
      walk({ id: "b", counts: { rabbit: 5 }, weather: "rain", time: "20:00" }),
    ]);
    expect(s.weatherRows.map((r) => r.id)).toEqual(["clear", "rain"]);
  });
});

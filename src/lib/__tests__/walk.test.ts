import { describe, expect, it } from "vitest";
import { draftTotals, isDraftSaveable, walkFromDraft } from "../walk";
import type { Draft } from "../../types";

const draft = (over: Partial<Draft> = {}): Draft => ({
  date: "2026-08-04",
  counts: {},
  road: 0,
  time: "",
  endTime: "",
  weather: null,
  note: "",
  ...over,
});

describe("isDraftSaveable — 'a walk can save on any ONE of counts, Bunny Road, or a time range'", () => {
  it("rejects a completely empty draft", () => {
    expect(isDraftSaveable(draft())).toBe(false);
  });

  it("counts alone suffice", () => {
    expect(isDraftSaveable(draft({ counts: { rabbit: 1 } }))).toBe(true);
  });

  it("Bunny Road alone suffices", () => {
    expect(isDraftSaveable(draft({ road: 3 }))).toBe(true);
  });

  it("a time range alone suffices", () => {
    expect(isDraftSaveable(draft({ time: "20:00", endTime: "20:45" }))).toBe(true);
  });

  it("a start time with no end is not a time range", () => {
    expect(isDraftSaveable(draft({ time: "20:00" }))).toBe(false);
  });

  it("both ends stamped in the same minute IS a range — a cut-short timed walk still saves", () => {
    expect(isDraftSaveable(draft({ time: "20:00", endTime: "20:00" }))).toBe(true);
    // and it stores with duration null, not 0
    expect(walkFromDraft(draft({ time: "20:00", endTime: "20:00" })).duration).toBeNull();
  });

  it("a note alone does not make a walk", () => {
    expect(isDraftSaveable(draft({ note: "lovely evening" }))).toBe(false);
  });
});

describe("walkFromDraft — builds the walk exactly as the prototype did", () => {
  it("derives duration and nulls the empties", () => {
    const w = walkFromDraft(draft({ time: "19:15", endTime: "20:45" }));
    expect(w.duration).toBe(90);
    expect(w.time).toBe("19:15");
    expect(w.endTime).toBe("20:45");
    expect(w.weather).toBeNull();
  });

  it("duration wraps midnight", () => {
    expect(walkFromDraft(draft({ time: "23:40", endTime: "00:25" })).duration).toBe(45);
  });

  it("no time range → duration null, times null", () => {
    const w = walkFromDraft(draft({ counts: { rabbit: 2 } }));
    expect(w.duration).toBeNull();
    expect(w.time).toBeNull();
    expect(w.endTime).toBeNull();
  });

  it("trims the note", () => {
    expect(walkFromDraft(draft({ road: 1, note: "  under the hedge  " })).note).toBe(
      "under the hedge",
    );
  });

  it("drops zeroed counts left behind by tap-undo", () => {
    const w = walkFromDraft(draft({ counts: { rabbit: 3, cat: 0 } }));
    expect(w.counts).toEqual({ rabbit: 3 });
  });

  it("keeps date, weather, and road independently", () => {
    const w = walkFromDraft(
      draft({ date: "2026-08-02", weather: "rain", road: 11, counts: { rabbit: 2 } }),
    );
    expect(w.date).toBe("2026-08-02");
    expect(w.weather).toBe("rain");
    expect(w.road).toBe(11); // never derived from counts
  });

  it("mints a fresh unique id per call", () => {
    const a = walkFromDraft(draft({ road: 1 }));
    const b = walkFromDraft(draft({ road: 1 }));
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^w/);
  });
});

describe("draftTotals", () => {
  it("reports the three save-gate quantities", () => {
    expect(draftTotals(draft({ counts: { rabbit: 2, cat: 1 }, road: 4, time: "20:00", endTime: "21:30" }))).toEqual({
      total: 3,
      mins: 90,
      road: 4,
    });
  });
});

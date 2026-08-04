import { describe, expect, it, vi } from "vitest";
import { addMins, fmtMins, fmtTime, hourLabel, minsBetween, prettyDate, today } from "../time";

describe("minsBetween", () => {
  it("computes a plain evening walk", () => {
    expect(minsBetween("19:15", "20:45")).toBe(90);
  });

  it("wraps midnight: 23:40 → 00:25 is 45 minutes, not negative", () => {
    expect(minsBetween("23:40", "00:25")).toBe(45);
  });

  it("treats identical start and end as 0", () => {
    expect(minsBetween("21:00", "21:00")).toBe(0);
  });

  it("returns 0 when either side is missing", () => {
    expect(minsBetween("", "20:00")).toBe(0);
    expect(minsBetween("20:00", "")).toBe(0);
    expect(minsBetween(null, undefined)).toBe(0);
  });

  it("handles the extreme wrap (one minute short of a full day)", () => {
    expect(minsBetween("00:01", "00:00")).toBe(1439);
  });
});

describe("fmtMins", () => {
  it("formats hours and minutes", () => {
    expect(fmtMins(90)).toBe("1h 30m");
    expect(fmtMins(60)).toBe("1h");
    expect(fmtMins(45)).toBe("45m");
    expect(fmtMins(125)).toBe("2h 5m");
  });

  it("shows a dash for zero/absent", () => {
    expect(fmtMins(0)).toBe("—");
    expect(fmtMins(null)).toBe("—");
    expect(fmtMins(undefined)).toBe("—");
  });

  it("rounds fractional minutes", () => {
    expect(fmtMins(89.6)).toBe("1h 30m");
  });
});

describe("fmtTime", () => {
  it("converts 24h to 12h with am/pm", () => {
    expect(fmtTime("19:15")).toBe("7:15 pm");
    expect(fmtTime("07:05")).toBe("7:05 am");
  });

  it("handles the 12 o'clock edges", () => {
    expect(fmtTime("00:05")).toBe("12:05 am");
    expect(fmtTime("12:00")).toBe("12:00 pm");
  });

  it("returns empty for missing input", () => {
    expect(fmtTime("")).toBe("");
    expect(fmtTime(null)).toBe("");
  });
});

describe("addMins", () => {
  it("adds within a day", () => {
    expect(addMins("19:15", 90)).toBe("20:45");
  });

  it("wraps past midnight", () => {
    expect(addMins("23:40", 45)).toBe("00:25");
  });

  it("returns empty when either input is falsy (reference behavior)", () => {
    expect(addMins("", 30)).toBe("");
    expect(addMins("10:00", 0)).toBe("");
    expect(addMins("10:00", null)).toBe("");
  });
});

describe("hourLabel", () => {
  it("labels hours in 12h form", () => {
    expect(hourLabel(19)).toBe("7 pm");
    expect(hourLabel(7)).toBe("7 am");
    expect(hourLabel(0)).toBe("12 am");
    expect(hourLabel(12)).toBe("12 pm");
  });
});

describe("today — the headline fix of the port", () => {
  // TZ is pinned to America/Toronto in src/test/setup.ts so these tests
  // can actually distinguish the local implementation from the
  // prototype's UTC one (in a UTC environment they agree at every hour).
  it("returns the LOCAL calendar date during a late-evening walk", () => {
    vi.useFakeTimers();
    try {
      // 2026-08-05 03:30 UTC = 2026-08-04 23:30 in Toronto (EDT, UTC-4)
      vi.setSystemTime(new Date("2026-08-05T03:30:00Z"));
      expect(today()).toBe("2026-08-04");
      // the prototype's implementation stamps tomorrow here:
      expect(new Date().toISOString().slice(0, 10)).toBe("2026-08-05");
    } finally {
      vi.useRealTimers();
    }
  });

  it("agrees with UTC in the middle of the local day", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-08-04T16:00:00Z")); // noon in Toronto
      expect(today()).toBe("2026-08-04");
    } finally {
      vi.useRealTimers();
    }
  });

  it("is in ISO form", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("prettyDate", () => {
  it("renders the given calendar day — a UTC ISO parse would show the previous day in Toronto", () => {
    // with the regression (new Date("2026-08-04")) this renders Aug 3
    // under the pinned negative offset, and \b4\b fails to match
    expect(prettyDate("2026-08-04")).toMatch(/\b4\b/);
    expect(prettyDate("2026-01-01")).toMatch(/\b1\b/); // EST as well as EDT
  });
});

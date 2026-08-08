import { describe, expect, it } from "vitest";
import { seasonOf } from "../season";

describe("seasonOf — meteorological seasons, northern hemisphere", () => {
  it("boundaries land where the calendar says", () => {
    expect(seasonOf("2026-03-01")).toBe("spring");
    expect(seasonOf("2026-05-31")).toBe("spring");
    expect(seasonOf("2026-06-01")).toBe("summer");
    expect(seasonOf("2026-08-31")).toBe("summer");
    expect(seasonOf("2026-09-01")).toBe("autumn");
    expect(seasonOf("2026-11-30")).toBe("autumn");
    expect(seasonOf("2026-12-01")).toBe("winter");
    expect(seasonOf("2026-01-15")).toBe("winter");
    expect(seasonOf("2026-02-28")).toBe("winter");
  });
});

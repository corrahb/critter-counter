import { describe, expect, it } from "vitest";
import { applyWalkToRecords } from "../records";
import { SEED_RECORDS, DEFAULT_SPECIES } from "../../data/constants";
import type { Records } from "../../types";

const seeds = (): Records => JSON.parse(JSON.stringify(SEED_RECORDS));

describe("seeded records", () => {
  it("are EXACTLY the spec's literals — every key pinned independently of SEED_RECORDS itself", () => {
    expect(SEED_RECORDS).toEqual({
      rabbit: { value: 25, date: "2026-07-24" },
      road: { value: 11, date: "2026-08-02" },
      turkey: { value: 2, date: null },
      raccoon: { value: 2, date: null },
      duration: { value: 90, date: null },
    });
  });
});

describe("applyWalkToRecords", () => {
  it("beats the rabbit record and stamps the walk's date", () => {
    const { records, beaten } = applyWalkToRecords({
      records: seeds(),
      species: DEFAULT_SPECIES,
      counts: { rabbit: 26 },
      road: 0,
      mins: 0,
      date: "2026-08-04",
    });
    expect(records.rabbit).toEqual({ value: 26, date: "2026-08-04" });
    expect(beaten).toEqual(["26 rabbits"]);
  });

  it("does NOT beat on a tie — strictly greater only", () => {
    const { records, beaten } = applyWalkToRecords({
      records: seeds(),
      species: DEFAULT_SPECIES,
      counts: { rabbit: 25 },
      road: 11,
      mins: 90,
      date: "2026-08-04",
    });
    expect(beaten).toEqual([]);
    expect(records.rabbit).toEqual(SEED_RECORDS.rabbit);
    expect(records.road).toEqual(SEED_RECORDS.road);
    expect(records.duration).toEqual(SEED_RECORDS.duration);
  });

  it("beats Bunny Road with its own message", () => {
    const { records, beaten } = applyWalkToRecords({
      records: seeds(),
      species: DEFAULT_SPECIES,
      counts: {},
      road: 12,
      mins: 0,
      date: "2026-08-04",
    });
    expect(records.road).toEqual({ value: 12, date: "2026-08-04" });
    expect(beaten).toEqual(["12 on Bunny Road"]);
  });

  it("beats duration with a formatted message", () => {
    const { records, beaten } = applyWalkToRecords({
      records: seeds(),
      species: DEFAULT_SPECIES,
      counts: {},
      road: 0,
      mins: 95,
      date: "2026-08-04",
    });
    expect(records.duration).toEqual({ value: 95, date: "2026-08-04" });
    expect(beaten).toEqual(["1h 35m walked"]);
  });

  it("a walk with no minutes never competes on duration", () => {
    const rec = seeds();
    rec.duration = { value: 0, date: null };
    const { beaten } = applyWalkToRecords({
      records: rec,
      species: DEFAULT_SPECIES,
      counts: {},
      road: 12,
      mins: 0,
      date: "2026-08-04",
    });
    // duration record sits at 0, yet mins: 0 must not "beat" it
    expect(beaten).toEqual(["12 on Bunny Road"]);
  });

  it("accumulates several beats in one walk", () => {
    const { beaten } = applyWalkToRecords({
      records: seeds(),
      species: DEFAULT_SPECIES,
      counts: { rabbit: 30, turkey: 3 },
      road: 15,
      mins: 120,
      date: "2026-08-04",
    });
    expect(beaten).toEqual(["30 rabbits", "3 wild turkeys", "15 on Bunny Road", "2h walked"]);
  });

  it("singular message for a first-ever single sighting", () => {
    const species = [...DEFAULT_SPECIES, { id: "fox-1", name: "Fox", icon: "🦊", custom: true }];
    const { records, beaten } = applyWalkToRecords({
      records: seeds(),
      species,
      counts: { "fox-1": 1 },
      road: 0,
      mins: 0,
      date: "2026-08-04",
    });
    expect(records["fox-1"]).toEqual({ value: 1, date: "2026-08-04" });
    expect(beaten).toEqual(["1 fox"]);
  });

  it("a species missing from records is beaten by any positive count", () => {
    const { records } = applyWalkToRecords({
      records: seeds(), // no "cat" key in seeds
      species: DEFAULT_SPECIES,
      counts: { cat: 1 },
      road: 0,
      mins: 0,
      date: "2026-08-04",
    });
    expect(records.cat).toEqual({ value: 1, date: "2026-08-04" });
  });

  it("does not mutate the input records object", () => {
    const input = seeds();
    applyWalkToRecords({
      records: input,
      species: DEFAULT_SPECIES,
      counts: { rabbit: 99 },
      road: 99,
      mins: 999,
      date: "2026-08-04",
    });
    expect(input).toEqual(SEED_RECORDS);
  });
});

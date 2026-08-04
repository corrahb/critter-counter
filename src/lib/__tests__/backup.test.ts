import { describe, expect, it } from "vitest";
import { backupFilename, parseBackup, serializeBackup } from "../backup";
import { DEFAULT_SPECIES, SEED_RECORDS } from "../../data/constants";
import type { State, Walk } from "../../types";

const walk = (over: Partial<Walk> = {}): Walk => ({
  id: "w-test",
  date: "2026-08-01",
  counts: { rabbit: 3 },
  road: 2,
  duration: 45,
  time: "20:00",
  endTime: "20:45",
  weather: "clear",
  note: "note",
  ...over,
});

const state = (): State => ({
  walks: [walk()],
  species: [...DEFAULT_SPECIES],
  records: { ...SEED_RECORDS },
});

describe("serialize → parse round trip", () => {
  it("loses nothing", () => {
    const s = state();
    const { state: restored, error } = parseBackup(serializeBackup(s));
    expect(error).toBeNull();
    expect(restored).toEqual(s);
  });
});

describe("parseBackup — the artefact prototype's clipboard shape", () => {
  it("imports it, normalizing legacy fields", () => {
    const artefact = JSON.stringify({
      v: 1,
      walks: [
        {
          id: 1722550000000,
          date: "2026-08-01",
          counts: { rabbit: 7 },
          road: { rabbit: 4 },
          duration: 60,
          time: "20:00",
          endTime: "21:00",
          weather: "clear",
          note: "",
        },
      ],
      species: DEFAULT_SPECIES,
      records: { rabbit: { value: 25 } },
    });
    const { state: s, error } = parseBackup(artefact);
    expect(error).toBeNull();
    expect(s).not.toBeNull();
    expect(s!.walks).toHaveLength(1);
    expect(s!.walks[0].id).toBe("1722550000000");
    expect(s!.walks[0].road).toBe(4);
    expect(s!.records.rabbit).toEqual({ value: 25, date: "2026-07-24" });
  });
});

describe("parseBackup — rejects what isn't a backup", () => {
  it("plain garbage", () => {
    expect(parseBackup("not json at all")).toEqual({ state: null, error: "invalid" });
  });

  it("valid JSON with no walks array", () => {
    expect(parseBackup('{"hello":"world"}').error).toBe("invalid");
    expect(parseBackup('{"walks":"nope"}').error).toBe("invalid");
    expect(parseBackup("null").error).toBe("invalid");
    expect(parseBackup("[1,2,3]").error).toBe("invalid");
  });

  it("an empty-walks backup is valid (explicitly starting over)", () => {
    const { state: s, error } = parseBackup('{"v":1,"walks":[]}');
    expect(error).toBeNull();
    expect(s!.walks).toEqual([]);
    expect(s!.species).toEqual(DEFAULT_SPECIES);
  });
});

describe("parseBackup — future-schema refusal", () => {
  it("refuses a backup stamped by a newer app version instead of silently stripping its fields", () => {
    const future = JSON.stringify({
      v: 1,
      schema: 3,
      walks: [{ ...walk(), temperature: 12 }],
    });
    expect(parseBackup(future)).toEqual({ state: null, error: "future-schema" });
  });

  it("accepts the current schema stamp", () => {
    const current = serializeBackup(state());
    expect(parseBackup(current).error).toBeNull();
  });

  it("accepts schema-less prototype backups", () => {
    expect(parseBackup('{"v":1,"walks":[]}').error).toBeNull();
  });
});

describe("backupFilename", () => {
  it("stamps the date", () => {
    expect(backupFilename("2026-08-04")).toBe("critter-counter-2026-08-04.json");
  });
});

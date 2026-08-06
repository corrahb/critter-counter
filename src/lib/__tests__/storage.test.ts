import { describe, expect, it } from "vitest";
import {
  CORRUPT_KEY,
  CORRUPT_PREV_KEY,
  FUTURE_KEY,
  MAIN_KEY,
  SNAP_INDEX_KEY,
  SNAP_PREFIX,
  StorageError,
  emptyState,
  listPreRestores,
  listSnapshots,
  loadDraft,
  loadPreRestore,
  loadSnapshot,
  loadState,
  normalizeDraft,
  normalizeState,
  normalizeWalk,
  saveDraft,
  saveState,
  snapshotDaily,
  sortWalks,
} from "../storage";
import { DEFAULT_SPECIES, SEED_RECORDS } from "../../data/constants";
import { today, yesterday } from "../time";
import type { State, Walk } from "../../types";

/** In-memory localStorage stand-in with per-key failure injection. */
const fakeKV = () => {
  const map = new Map<string, string>();
  const failTimes = new Map<string, number>(); // exact key → remaining failures
  const kv = {
    map,
    failTimes,
    failWrites: false,
    /** Make writes to `key` fail `times` times (Infinity = always). */
    failKey(key: string, times = Infinity) {
      failTimes.set(key, times);
    },
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (kv.failWrites) throw new Error("QuotaExceededError");
      const remaining = failTimes.get(k);
      if (remaining && remaining > 0) {
        failTimes.set(k, remaining - 1);
        throw new Error("QuotaExceededError");
      }
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
  return kv;
};

const walk = (over: Partial<Walk> = {}): Walk => ({
  id: "w-test",
  date: "2026-08-01",
  counts: { rabbit: 3 },
  road: 0,
  duration: null,
  time: null,
  endTime: null,
  weather: null,
  note: "",
  ...over,
});

const stateWith = (walks: Walk[]): State => ({
  walks,
  species: [...DEFAULT_SPECIES],
  records: { ...SEED_RECORDS },
});

/** A backup exactly as the artefact prototype produced it. */
const artefactShape = {
  v: 1,
  walks: [
    {
      id: 1722550000001,
      date: "2026-08-02",
      counts: { rabbit: 11 },
      road: 11,
      duration: null,
      time: "19:15",
      endTime: "20:45",
      weather: null,
      note: "",
    },
    {
      id: 1722550000000,
      date: "2026-08-01",
      counts: { rabbit: 7, cat: 1 },
      road: { rabbit: 4 }, // legacy: road stored per-species
      duration: 60,
      time: "20:00",
      endTime: "21:00",
      weather: "clear",
      note: "two kits under the hedge",
    },
  ],
  species: [
    { id: "rabbit", name: "Rabbit", icon: "🐇" },
    { id: "raccoon", name: "Raccoon", icon: "🦝" },
    { id: "turkey", name: "Wild turkey", icon: "🦃" }, // pre-rename name, as real old backups have
    { id: "cat", name: "Cat", icon: "🐈" },
    { id: "fox-a1b2", name: "Fox", icon: "🦊", custom: true },
  ],
  records: {
    rabbit: { value: 25 }, // saved before dates existed
    road: { value: 11, date: "2026-08-02" },
    turkey: { value: 2, date: null },
  },
};

describe("normalizeWalk — migrating the artefact's shapes", () => {
  it("stringifies legacy numeric ids", () => {
    expect(normalizeWalk({ id: 1722550000000, date: "2026-08-01" }).id).toBe("1722550000000");
  });

  it("generates a prefixed id when missing — can't collide with stringified numerics", () => {
    expect(normalizeWalk({ date: "2026-08-01" }).id).toMatch(/^w/);
  });

  it("sums a legacy per-species road object into a plain number", () => {
    expect(normalizeWalk({ date: "2026-08-01", road: { rabbit: 4, cat: 2 } }).road).toBe(6);
  });

  it("derives duration from times when it wasn't stored", () => {
    const w = normalizeWalk({ date: "2026-08-02", time: "19:15", endTime: "20:45" });
    expect(w.duration).toBe(90);
  });

  it("derives across midnight", () => {
    const w = normalizeWalk({ date: "2026-08-02", time: "23:40", endTime: "00:25" });
    expect(w.duration).toBe(45);
  });

  it("drops zero counts and coerces junk", () => {
    const w = normalizeWalk({ date: "2026-08-01", counts: { rabbit: 3, cat: 0, weird: "2" } });
    expect(w.counts).toEqual({ rabbit: 3, weird: 2 });
  });

  it("rejects unknown weather ids", () => {
    expect(normalizeWalk({ date: "2026-08-01", weather: "hail" }).weather).toBeNull();
    expect(normalizeWalk({ date: "2026-08-01", weather: "rain" }).weather).toBe("rain");
  });

  it("is idempotent on already-normalized walks", () => {
    const w = walk({ duration: 45, time: "21:00", endTime: "21:45", weather: "clear" });
    expect(normalizeWalk(w)).toEqual(w);
  });
});

describe("normalizeState — nothing is lost on migration", () => {
  it("imports the artefact backup with every walk intact", () => {
    const s = normalizeState(artefactShape);
    expect(s.walks).toHaveLength(2);
    expect(s.walks[0].date).toBe("2026-08-02"); // sorted newest first
    expect(s.walks[0].id).toBe("1722550000001");
    expect(s.walks[0].duration).toBe(90); // derived from 19:15 → 20:45
    expect(s.walks[1].road).toBe(4); // legacy object summed
    expect(s.walks[1].note).toBe("two kits under the hedge");
    expect(s.species).toHaveLength(5);
    expect(s.species[4]).toEqual({ id: "fox-a1b2", name: "Fox", icon: "🦊", custom: true });
    // the 2026-08-04 rename migrates the default's old name in old backups
    expect(s.species[2]).toEqual({ id: "turkey", name: "Turkey", icon: "🦃" });
  });

  it("recovers the seed date for a record saved before dates existed, when the value still matches", () => {
    const s = normalizeState(artefactShape);
    expect(s.records.rabbit).toEqual({ value: 25, date: "2026-07-24" });
  });

  it("keeps a merged record's own date when it has one", () => {
    const s = normalizeState(artefactShape);
    expect(s.records.road).toEqual({ value: 11, date: "2026-08-02" });
  });

  it("fills missing seed records (duration survives a partial backup)", () => {
    const s = normalizeState(artefactShape);
    expect(s.records.duration).toEqual({ value: 90, date: null });
  });

  it("falls back to defaults for garbage species", () => {
    const s = normalizeState({ walks: [], species: "nope", records: null });
    expect(s.species).toEqual(DEFAULT_SPECIES);
    expect(s.records).toEqual(SEED_RECORDS);
  });
});

describe("sortWalks", () => {
  it("sorts newest date first and is stable within a date", () => {
    const a = walk({ id: "a", date: "2026-08-01" });
    const b = walk({ id: "b", date: "2026-08-03" });
    const c = walk({ id: "c", date: "2026-08-01" });
    expect(sortWalks([a, b, c]).map((w) => w.id)).toEqual(["b", "a", "c"]);
  });
});

describe("saveState / loadState round trip", () => {
  it("persists and restores identically", () => {
    const kv = fakeKV();
    const s = stateWith([walk({ weather: "rain", duration: 45, note: "wet" })]);
    saveState(kv, s);
    const { state, healedFrom, futureSchema } = loadState(kv);
    expect(healedFrom).toBeNull();
    expect(futureSchema).toBeNull();
    expect(state).toEqual(s);
  });

  it("returns the empty state on a fresh device", () => {
    const { state, healedFrom } = loadState(fakeKV());
    expect(state).toEqual(emptyState());
    expect(healedFrom).toBeNull();
  });
});

describe("refuse-to-shrink guard", () => {
  it("throws instead of replacing a non-empty log with an empty one", () => {
    const kv = fakeKV();
    saveState(kv, stateWith([walk()]));
    expect(() => saveState(kv, stateWith([]))).toThrow(StorageError);
    // and the original data is untouched
    expect(loadState(kv).state.walks).toHaveLength(1);
  });

  it("permits it for an explicit restore (allowEmpty)", () => {
    const kv = fakeKV();
    saveState(kv, stateWith([walk()]));
    saveState(kv, stateWith([]), { allowEmpty: true });
    expect(loadState(kv).state.walks).toHaveLength(0);
  });

  it("allows shrinking that isn't emptying (deleting one walk of two)", () => {
    const kv = fakeKV();
    saveState(kv, stateWith([walk({ id: "a" }), walk({ id: "b" })]));
    saveState(kv, stateWith([walk({ id: "a" })]));
    expect(loadState(kv).state.walks).toHaveLength(1);
  });

  it("also refuses to erase all species definitions", () => {
    const kv = fakeKV();
    saveState(kv, stateWith([walk()]));
    const bad: State = { walks: [walk()], species: [], records: { ...SEED_RECORDS } };
    expect(() => saveState(kv, bad)).toThrow(StorageError);
    expect(loadState(kv).state.species).toEqual(DEFAULT_SPECIES);
  });

  it("also refuses to erase all records", () => {
    const kv = fakeKV();
    saveState(kv, stateWith([walk()]));
    const bad: State = { walks: [walk()], species: [...DEFAULT_SPECIES], records: {} };
    expect(() => saveState(kv, bad)).toThrow(StorageError);
    expect(loadState(kv).state.records).toEqual(SEED_RECORDS);
  });

  it("allowEmpty bypasses the species/records guards too (full restore)", () => {
    const kv = fakeKV();
    saveState(kv, stateWith([walk()]));
    const empty: State = { walks: [walk()], species: [], records: {} };
    saveState(kv, empty, { allowEmpty: true });
    // load re-defaults them — but the write itself was permitted
    expect(loadState(kv).state.species).toEqual(DEFAULT_SPECIES);
  });
});

describe("write failures", () => {
  it("throws StorageError and leaves the previous value intact", () => {
    const kv = fakeKV();
    saveState(kv, stateWith([walk()]));
    kv.failWrites = true;
    expect(() => saveState(kv, stateWith([walk(), walk({ id: "w2" })]))).toThrow(StorageError);
    kv.failWrites = false;
    expect(loadState(kv).state.walks).toHaveLength(1);
  });
});

describe("corrupt main value", () => {
  it("self-heals from the newest parseable snapshot", () => {
    const kv = fakeKV();
    const good = stateWith([walk()]);
    kv.setItem(SNAP_PREFIX + "2026-08-01", JSON.stringify(good));
    kv.setItem(SNAP_INDEX_KEY, JSON.stringify(["2026-08-01"]));
    kv.setItem(MAIN_KEY, "{corrupt json!!");
    const { state, healedFrom } = loadState(kv);
    expect(healedFrom).toBe("2026-08-01");
    expect(state.walks).toHaveLength(1);
  });

  it("prefers the newest snapshot when several exist", () => {
    const kv = fakeKV();
    kv.setItem(SNAP_PREFIX + "2026-08-01", JSON.stringify(stateWith([walk({ id: "old" })])));
    kv.setItem(
      SNAP_PREFIX + "2026-08-02",
      JSON.stringify(stateWith([walk({ id: "new" }), walk({ id: "new2" })])),
    );
    kv.setItem(SNAP_INDEX_KEY, JSON.stringify(["2026-08-01", "2026-08-02"]));
    const { state, healedFrom } = loadState(kv);
    expect(healedFrom).toBe("2026-08-02");
    expect(state.walks.map((w) => w.id)).toEqual(["new", "new2"]);
  });

  it("heals PAST a corrupt newest snapshot to an older good one", () => {
    const kv = fakeKV();
    kv.setItem(SNAP_PREFIX + "2026-08-01", JSON.stringify(stateWith([walk({ id: "good" })])));
    kv.setItem(SNAP_PREFIX + "2026-08-02", "{also corrupt");
    kv.setItem(SNAP_INDEX_KEY, JSON.stringify(["2026-08-01", "2026-08-02"]));
    kv.setItem(MAIN_KEY, "{corrupt json!!");
    const { state, healedFrom } = loadState(kv);
    expect(healedFrom).toBe("2026-08-01");
    expect(state.walks.map((w) => w.id)).toEqual(["good"]);
  });

  it("stashes the corrupt value for forensics instead of discarding it", () => {
    const kv = fakeKV();
    kv.setItem(MAIN_KEY, "{corrupt json!!");
    saveState(kv, stateWith([walk()]));
    expect(kv.getItem(CORRUPT_KEY)).toBe("{corrupt json!!");
    expect(loadState(kv).state.walks).toHaveLength(1);
  });

  it("keeps the previous stash in a second slot when corruption strikes twice", () => {
    const kv = fakeKV();
    kv.setItem(MAIN_KEY, "{corrupt A");
    saveState(kv, stateWith([walk()]));
    kv.setItem(MAIN_KEY, "{corrupt B");
    saveState(kv, stateWith([walk()]));
    expect(kv.getItem(CORRUPT_KEY)).toBe("{corrupt B");
    expect(kv.getItem(CORRUPT_PREV_KEY)).toBe("{corrupt A");
  });

  it("under quota pressure, prunes the oldest snapshot and retries the stash once", () => {
    const kv = fakeKV();
    kv.setItem(SNAP_PREFIX + "2026-08-01", JSON.stringify(stateWith([walk()])));
    kv.setItem(SNAP_PREFIX + "2026-08-02", JSON.stringify(stateWith([walk()])));
    kv.setItem(SNAP_INDEX_KEY, JSON.stringify(["2026-08-01", "2026-08-02"]));
    kv.setItem(MAIN_KEY, "{corrupt json!!");
    kv.failKey(CORRUPT_KEY, 1); // first stash attempt hits quota
    saveState(kv, stateWith([walk()]));
    expect(kv.getItem(CORRUPT_KEY)).toBe("{corrupt json!!"); // retry landed
    expect(kv.getItem(SNAP_PREFIX + "2026-08-01")).toBeNull(); // oldest pruned
    expect(kv.getItem(SNAP_PREFIX + "2026-08-02")).not.toBeNull();
    expect(loadState(kv).state.walks).toHaveLength(1); // main still written
  });

  it("if the stash cannot be written at all, saving current data still wins", () => {
    const kv = fakeKV();
    kv.setItem(MAIN_KEY, "{corrupt json!!");
    kv.failKey(CORRUPT_KEY); // always fails
    expect(() => saveState(kv, stateWith([walk()]))).not.toThrow();
    expect(loadState(kv).state.walks).toHaveLength(1);
  });
});

describe("pre-restore stash — restores are undoable", () => {
  it("a same-day restore no longer destroys walks saved earlier that day", () => {
    const kv = fakeKV();
    const d = "2026-08-04";
    // 09:00 — first save of the day (snapshots the pre-write state)
    saveState(kv, stateWith([walk({ id: "w49" })]), { date: d });
    saveState(kv, stateWith([walk({ id: "w49" }), walk({ id: "w50" })]), { date: d });
    // 21:00 — restore an old smaller backup
    saveState(kv, stateWith([walk({ id: "old-1" })]), { date: d, reason: "restore" });
    // walk w50 survives in the pre-restore stash
    const stashes = listPreRestores(kv);
    expect(stashes).toHaveLength(1);
    expect(stashes[0].walkCount).toBe(2);
    const recovered = loadPreRestore(kv, stashes[0].ts);
    expect(recovered?.walks.map((w) => w.id)).toEqual(["w49", "w50"]);
  });

  it("an allowEmpty restore preserves the replaced state too", () => {
    const kv = fakeKV();
    saveState(kv, stateWith([walk({ id: "only" })]));
    saveState(kv, stateWith([]), { allowEmpty: true, reason: "restore" });
    const stashes = listPreRestores(kv);
    expect(stashes).toHaveLength(1);
    expect(loadPreRestore(kv, stashes[0].ts)?.walks.map((w) => w.id)).toEqual(["only"]);
  });

  it("keeps the newest three stashes and prunes older key material", () => {
    const kv = fakeKV();
    saveState(kv, stateWith([walk({ id: "w0" })]));
    for (let i = 1; i <= 4; i++) {
      saveState(kv, stateWith([walk({ id: `w${i}` })]), { reason: "restore" });
    }
    expect(listPreRestores(kv)).toHaveLength(3);
    // 4 restores happened; only 3 stash keys may remain in the store
    const stashKeys = [...kv.map.keys()].filter((k) => k.startsWith("critter-counter/pre-restore/") && !k.includes("index"));
    expect(stashKeys).toHaveLength(3);
  });

  it("a plain save (no reason) does not stash", () => {
    const kv = fakeKV();
    saveState(kv, stateWith([walk()]));
    saveState(kv, stateWith([walk(), walk({ id: "w2" })]));
    expect(listPreRestores(kv)).toHaveLength(0);
  });
});

describe("future-schema guard", () => {
  const futurePayload = JSON.stringify({
    schema: 3,
    walks: [{ ...walk({ id: "f1" }), temperature: 12 }],
    species: DEFAULT_SPECIES,
    records: SEED_RECORDS,
    routes: ["hypothetical new top-level field"],
  });

  it("loads tolerantly but flags it and preserves the original bytes", () => {
    const kv = fakeKV();
    kv.setItem(MAIN_KEY, futurePayload);
    const { state, futureSchema } = loadState(kv);
    expect(futureSchema).toBe(3);
    expect(state.walks.map((w) => w.id)).toEqual(["f1"]);
    expect(kv.getItem(FUTURE_KEY)).toBe(futurePayload);
  });

  it("the preserved original survives later saves from this old version", () => {
    const kv = fakeKV();
    kv.setItem(MAIN_KEY, futurePayload);
    const { state } = loadState(kv);
    saveState(kv, state); // old code writes its reduced shape
    expect(kv.getItem(FUTURE_KEY)).toBe(futurePayload);
    expect(loadState(kv).futureSchema).toBeNull(); // main is schema 2 again
  });

  it("current-schema data is never flagged", () => {
    const kv = fakeKV();
    saveState(kv, stateWith([walk()]));
    expect(loadState(kv).futureSchema).toBeNull();
    expect(kv.getItem(FUTURE_KEY)).toBeNull();
  });
});

describe("daily snapshots", () => {
  it("saves at most one snapshot per day (the pre-write state)", () => {
    const kv = fakeKV();
    saveState(kv, stateWith([walk({ id: "a" })]), { date: "2026-08-04" });
    // first save of the day had no previous value → no snapshot yet
    expect(listSnapshots(kv)).toHaveLength(0);
    saveState(kv, stateWith([walk({ id: "a" }), walk({ id: "b" })]), { date: "2026-08-04" });
    const snaps = listSnapshots(kv);
    expect(snaps).toEqual([{ date: "2026-08-04", walkCount: 1 }]);
    // further same-day saves don't overwrite the day's snapshot
    saveState(kv, stateWith([walk({ id: "a" })]), { date: "2026-08-04" });
    expect(listSnapshots(kv)).toEqual([{ date: "2026-08-04", walkCount: 1 }]);
  });

  it("prunes to the newest five days", () => {
    const kv = fakeKV();
    const text = JSON.stringify(stateWith([walk()]));
    for (let d = 1; d <= 7; d++) {
      snapshotDaily(kv, text, `2026-08-0${d}`);
    }
    const dates = listSnapshots(kv).map((s) => s.date);
    expect(dates).toEqual(["2026-08-07", "2026-08-06", "2026-08-05", "2026-08-04", "2026-08-03"]);
    // pruned snapshot keys are actually removed, not orphaned
    expect(kv.getItem(SNAP_PREFIX + "2026-08-01")).toBeNull();
    expect(kv.getItem(SNAP_PREFIX + "2026-08-02")).toBeNull();
  });

  it("loadSnapshot returns the normalized state, null for garbage", () => {
    const kv = fakeKV();
    kv.setItem(SNAP_PREFIX + "2026-08-01", JSON.stringify(stateWith([walk()])));
    expect(loadSnapshot(kv, "2026-08-01")?.walks).toHaveLength(1);
    expect(loadSnapshot(kv, "2026-08-09")).toBeNull();
    kv.setItem(SNAP_PREFIX + "2026-08-02", "{bad");
    expect(loadSnapshot(kv, "2026-08-02")).toBeNull();
  });

  it("listSnapshots skips missing, corrupt, and walk-less entries", () => {
    const kv = fakeKV();
    kv.setItem(SNAP_INDEX_KEY, JSON.stringify(["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04"]));
    // 08-04: key missing entirely
    kv.setItem(SNAP_PREFIX + "2026-08-03", "{corrupt");
    kv.setItem(SNAP_PREFIX + "2026-08-02", JSON.stringify({ notWalks: true }));
    kv.setItem(SNAP_PREFIX + "2026-08-01", JSON.stringify(stateWith([walk()])));
    expect(listSnapshots(kv)).toEqual([{ date: "2026-08-01", walkCount: 1 }]);
  });

  it("an index-write failure self-corrects on the next snapshot attempt", () => {
    const kv = fakeKV();
    const text = JSON.stringify(stateWith([walk()]));
    kv.failKey(SNAP_INDEX_KEY, 1);
    snapshotDaily(kv, text, "2026-08-04"); // snap written, index write failed
    expect(listSnapshots(kv)).toHaveLength(0); // index empty → invisible
    snapshotDaily(kv, text, "2026-08-04"); // date not in index → retried whole
    expect(listSnapshots(kv)).toEqual([{ date: "2026-08-04", walkCount: 1 }]);
  });
});

describe("draft", () => {
  it("round-trips today's draft, running timer included", () => {
    const kv = fakeKV();
    const d = {
      date: today(),
      counts: { rabbit: 4 },
      road: 2,
      time: "20:00",
      endTime: "",
      weather: null,
      note: "mid-walk",
      walking: true,
    };
    saveDraft(kv, d);
    // closing the app mid-walk must NOT stop the timer
    expect(loadDraft(kv)).toEqual(d);
  });

  it("a walking flag without a start time is dropped (can't time an unstarted walk)", () => {
    const kv = fakeKV();
    saveDraft(kv, {
      date: today(),
      counts: {},
      road: 0,
      time: "",
      endTime: "",
      weather: null,
      note: "",
      walking: true,
    });
    expect(loadDraft(kv)?.walking).toBe(false);
  });

  it("ignores a stale draft from another day", () => {
    const kv = fakeKV();
    saveDraft(kv, {
      date: "2020-01-01",
      counts: { rabbit: 4 },
      road: 0,
      time: "",
      endTime: "",
      weather: null,
      note: "",
    });
    expect(loadDraft(kv)).toBeNull();
  });

  it("a walk still RUNNING from yesterday survives midnight — timer, counts, and date intact", () => {
    const kv = fakeKV();
    const d = {
      date: yesterday(), // started 23:45, phone reopened past midnight
      counts: { rabbit: 3 },
      road: 1,
      time: "23:45",
      endTime: "",
      weather: null,
      note: "",
      walking: true,
    };
    saveDraft(kv, d);
    const restored = loadDraft(kv);
    expect(restored).not.toBeNull();
    expect(restored!.walking).toBe(true);
    expect(restored!.counts).toEqual({ rabbit: 3 });
    expect(restored!.date).toBe(yesterday()); // the walk keeps the night it started
  });

  it("yesterday's draft withOUT a running walk is still stale", () => {
    const kv = fakeKV();
    saveDraft(kv, {
      date: yesterday(),
      counts: { rabbit: 3 },
      road: 0,
      time: "23:45",
      endTime: "23:59", // stopped — finished walk left unsaved = abandoned
      weather: null,
      note: "",
      walking: false,
    });
    expect(loadDraft(kv)).toBeNull();
  });

  it("a running walk from TWO days ago is abandoned, not live", () => {
    const kv = fakeKV();
    saveDraft(kv, {
      date: "2020-01-01",
      counts: {},
      road: 0,
      time: "23:45",
      endTime: "",
      weather: null,
      note: "",
      walking: true,
    });
    expect(loadDraft(kv)).toBeNull();
  });

  it("returns null (not a crash) for corrupt draft JSON at boot", () => {
    const kv = fakeKV();
    kv.setItem("critter-counter/draft/v1", "{not json");
    expect(loadDraft(kv)).toBeNull();
  });

  it("saveDraft never throws mid-walk, even when writes fail", () => {
    const kv = fakeKV();
    kv.failWrites = true;
    expect(() =>
      saveDraft(kv, {
        date: today(),
        counts: {},
        road: 0,
        time: "",
        endTime: "",
        weather: null,
        note: "",
      }),
    ).not.toThrow();
  });

  it("normalizeDraft coerces every junk field", () => {
    const d = normalizeDraft({
      date: "",
      counts: { rabbit: "3", cat: 0, junk: "x" },
      road: "5", // non-number → 0
      time: 7, // non-string → ""
      endTime: null,
      weather: "hail", // unknown → null
      note: 42, // non-string → ""
    });
    expect(d.date).toBe(today());
    expect(d.counts).toEqual({ rabbit: 3 });
    expect(d.road).toBe(0);
    expect(d.time).toBe("");
    expect(d.endTime).toBe("");
    expect(d.weather).toBeNull();
    expect(d.note).toBe("");
    expect(d.walking).toBe(false); // junk "walking" never fabricates a timer
  });

  it("normalizeDraft handles a non-object", () => {
    expect(normalizeDraft("garbage").counts).toEqual({});
    expect(normalizeDraft(null).road).toBe(0);
  });
});

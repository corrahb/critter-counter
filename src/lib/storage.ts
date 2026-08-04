/**
 * The storage layer, built around one promise: A CODE UPDATE MUST NEVER
 * LOSE THE LOG. The layers:
 *
 *  1. Versioned key + non-destructive migrations — old shapes are read
 *     and normalized, never deleted. There is NO clear() and NO wildcard
 *     key removal anywhere in this codebase.
 *  2. Rolling daily snapshots — the first write of each day preserves the
 *     previous state under its own key; the newest 5 days are kept.
 *  3. Refuse-to-shrink — a write that would empty a non-empty walk log,
 *     empty a non-empty species list, or empty non-empty records throws
 *     instead (an explicit restore passes allowEmpty).
 *  4. Self-heal on boot — if the main key is missing or corrupt but a
 *     snapshot parses, the newest good snapshot is restored automatically.
 *  5. Corrupt-value forensics — an unparseable main value is stashed
 *     before being overwritten (two most recent kept; under quota
 *     pressure one old snapshot is pruned and the stash retried once —
 *     if even that fails, saving the user's CURRENT data takes priority
 *     over preserving corrupt bytes).
 *  6. Pre-restore stash — a restore (the one legitimate bulk-replace)
 *     always preserves the state it replaced, newest 3 kept, so
 *     "restored the wrong backup" is undoable.
 *  7. Future-schema guard — data written by a NEWER app version loads
 *     tolerantly, but the original text is preserved untouched under its
 *     own key and the load is flagged so the UI can warn that saving
 *     from old code may drop newer fields.
 *
 * Everything takes an injectable KV (window.localStorage in the app,
 * an in-memory fake in tests).
 */
import type { Draft, Records, Species, State, Walk, WeatherId } from "../types";
import { DEFAULT_SPECIES, SEED_RECORDS, WEATHER } from "../data/constants";
import { minsBetween, today } from "./time";
import { newWalkId } from "./id";

export const MAIN_KEY = "critter-counter/v1";
export const DRAFT_KEY = "critter-counter/draft/v1";
export const SNAP_PREFIX = "critter-counter/snap/";
export const SNAP_INDEX_KEY = "critter-counter/snap-index";
export const CORRUPT_KEY = `${MAIN_KEY}.corrupt`;
export const CORRUPT_PREV_KEY = `${MAIN_KEY}.corrupt.prev`;
export const PRE_RESTORE_PREFIX = "critter-counter/pre-restore/";
export const PRE_RESTORE_INDEX_KEY = "critter-counter/pre-restore-index";
export const FUTURE_KEY = "critter-counter/future-original";
export const CURRENT_SCHEMA = 2;
export const MAX_SNAPSHOTS = 5;
export const MAX_PRE_RESTORES = 3;

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class StorageError extends Error {}

const WEATHER_IDS = new Set<string>(WEATHER.map((w) => w.id));

/* ── normalization (the migration path) ─────────────────────────
   Schema 1 = the artefact prototype's shape: numeric Date.now() ids,
   `road` sometimes a per-species object, fields occasionally absent.
   Schema 2 = the shapes in types.ts. Normalizing is idempotent, so one
   pass handles both old and current data. */

const sumValues = (obj: object): number =>
  Object.values(obj).reduce((a: number, b) => a + (Number(b) || 0), 0);

const cleanCount = (v: unknown): number => Math.max(0, Math.round(Number(v) || 0));

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migration boundary
export function normalizeWalk(raw: any): Walk {
  const time = typeof raw?.time === "string" && raw.time ? raw.time : null;
  const endTime = typeof raw?.endTime === "string" && raw.endTime ? raw.endTime : null;

  const counts: Record<string, number> = {};
  if (raw?.counts && typeof raw.counts === "object") {
    for (const [k, v] of Object.entries(raw.counts)) {
      const n = cleanCount(v);
      if (n > 0) counts[k] = n;
    }
  }

  const road =
    typeof raw?.road === "number"
      ? Math.max(0, Math.round(raw.road))
      : raw?.road && typeof raw.road === "object"
        ? cleanCount(sumValues(raw.road))
        : 0;

  let duration =
    typeof raw?.duration === "number" && raw.duration > 0 ? Math.round(raw.duration) : null;
  if (duration == null && time && endTime) {
    const m = minsBetween(time, endTime);
    duration = m > 0 ? m : null;
  }

  return {
    id: raw?.id != null && raw.id !== "" ? String(raw.id) : newWalkId(),
    date: typeof raw?.date === "string" && raw.date ? raw.date : today(),
    counts,
    road,
    duration,
    time,
    endTime,
    weather: WEATHER_IDS.has(raw?.weather) ? (raw.weather as WeatherId) : null,
    note: typeof raw?.note === "string" ? raw.note : "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migration boundary
export function normalizeSpecies(raw: any): Species[] {
  if (!Array.isArray(raw)) return [...DEFAULT_SPECIES];
  const out: Species[] = [];
  for (const s of raw) {
    if (s && typeof s.id === "string" && s.id && typeof s.name === "string" && s.name) {
      // the default turkey was renamed "Wild turkey" → "Turkey" (2026-08-04);
      // migrate exactly that pairing so old backups pick up the new name,
      // while any custom naming is left alone
      const name = s.id === "turkey" && s.name === "Wild turkey" ? "Turkey" : s.name;
      out.push({
        id: s.id,
        name,
        icon: typeof s.icon === "string" && s.icon ? s.icon : "🐾",
        ...(s.custom ? { custom: true } : {}),
      });
    }
  }
  return out.length ? out : [...DEFAULT_SPECIES];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migration boundary
export function normalizeRecords(raw: any): Records {
  const merged: Records = { ...SEED_RECORDS };
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      if (v && typeof v === "object" && "value" in v) {
        const entry = v as { value?: unknown; date?: unknown };
        merged[k] = {
          value: cleanCount(entry.value),
          date: typeof entry.date === "string" && entry.date ? entry.date : null,
        };
      } else if (typeof v === "number") {
        // ultra-legacy: records stored as plain numbers
        merged[k] = { value: cleanCount(v), date: null };
      }
    }
  }
  // a record saved before dates existed keeps its seed date if the value still matches
  for (const k of Object.keys(SEED_RECORDS)) {
    const m = merged[k];
    const seed = SEED_RECORDS[k];
    if (m && !m.date && seed.date && m.value === seed.value) {
      merged[k] = { ...m, date: seed.date };
    }
  }
  return merged;
}

/**
 * Date-desc sort. The prototype's comparator returned -1 for equal dates
 * (inconsistent — arbitrary order for two walks on the same date); this
 * one returns 0 there, and Array.prototype.sort's stability keeps
 * insertion order (newest saved first) within a date.
 */
export const sortWalks = (walks: Walk[]): Walk[] =>
  [...walks].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migration boundary
export function normalizeState(raw: any): State {
  const walks = Array.isArray(raw?.walks) ? raw.walks.map(normalizeWalk) : [];
  return {
    walks: sortWalks(walks),
    species: normalizeSpecies(raw?.species),
    records: normalizeRecords(raw?.records),
  };
}

export const emptyState = (): State => ({
  walks: [],
  species: [...DEFAULT_SPECIES],
  records: { ...SEED_RECORDS },
});

/** The stamped schema of a stored/backup payload, if any. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migration boundary
export const schemaOf = (parsed: any): number | null =>
  typeof parsed?.schema === "number" ? parsed.schema : null;

/* ── snapshots ──────────────────────────────────────────────── */

/** Snapshot dates, newest first. */
export function readSnapIndex(kv: KV): string[] {
  try {
    const t = kv.getItem(SNAP_INDEX_KEY);
    if (!t) return [];
    const p = JSON.parse(t);
    if (!Array.isArray(p)) return [];
    return p
      .filter((d): d is string => typeof d === "string")
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/**
 * On the first write of each day, preserve the pre-write state under
 * today's date and prune to the newest MAX_SNAPSHOTS days. The index is
 * written BEFORE pruned keys are removed, so a failure mid-sequence can
 * orphan a key (harmless) but never leave the index pointing at nothing.
 * Best-effort: a snapshot failure never blocks the actual save.
 */
export function snapshotDaily(kv: KV, prevText: string, date: string = today()): void {
  try {
    const index = readSnapIndex(kv);
    if (index.includes(date)) return;
    kv.setItem(SNAP_PREFIX + date, prevText);
    const next = [date, ...index].sort().reverse().slice(0, MAX_SNAPSHOTS);
    kv.setItem(SNAP_INDEX_KEY, JSON.stringify(next));
    for (const old of index) {
      if (!next.includes(old)) kv.removeItem(SNAP_PREFIX + old);
    }
  } catch {
    /* snapshots are belt-and-braces, never load-bearing */
  }
}

export interface SnapshotInfo {
  date: string;
  walkCount: number;
}

/** For the "Restore an earlier snapshot" list in Patterns. */
export function listSnapshots(kv: KV): SnapshotInfo[] {
  const out: SnapshotInfo[] = [];
  for (const date of readSnapIndex(kv)) {
    try {
      const t = kv.getItem(SNAP_PREFIX + date);
      if (!t) continue;
      const p = JSON.parse(t);
      if (p && Array.isArray(p.walks)) out.push({ date, walkCount: p.walks.length });
    } catch {
      /* skip unreadable snapshots */
    }
  }
  return out;
}

export function loadSnapshot(kv: KV, date: string): State | null {
  try {
    const t = kv.getItem(SNAP_PREFIX + date);
    if (!t) return null;
    const p = JSON.parse(t);
    if (!p || !Array.isArray(p.walks)) return null;
    return normalizeState(p);
  } catch {
    return null;
  }
}

/* ── pre-restore stash (undo for "restored the wrong backup") ── */

function readPreRestoreIndex(kv: KV): string[] {
  try {
    const t = kv.getItem(PRE_RESTORE_INDEX_KEY);
    if (!t) return [];
    const p = JSON.parse(t);
    if (!Array.isArray(p)) return [];
    return p
      .filter((d): d is string => typeof d === "string")
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

function stashPreRestore(kv: KV, prevText: string): void {
  try {
    const ts = `${new Date().toISOString()}-${Math.random().toString(36).slice(2, 5)}`;
    const index = readPreRestoreIndex(kv);
    kv.setItem(PRE_RESTORE_PREFIX + ts, prevText);
    const next = [ts, ...index].sort().reverse().slice(0, MAX_PRE_RESTORES);
    kv.setItem(PRE_RESTORE_INDEX_KEY, JSON.stringify(next));
    for (const old of index) {
      if (!next.includes(old)) kv.removeItem(PRE_RESTORE_PREFIX + old);
    }
  } catch {
    /* best-effort; the restore itself still proceeds */
  }
}

export interface PreRestoreInfo {
  ts: string;
  walkCount: number;
}

export function listPreRestores(kv: KV): PreRestoreInfo[] {
  const out: PreRestoreInfo[] = [];
  for (const ts of readPreRestoreIndex(kv)) {
    try {
      const t = kv.getItem(PRE_RESTORE_PREFIX + ts);
      if (!t) continue;
      const p = JSON.parse(t);
      if (p && Array.isArray(p.walks)) out.push({ ts, walkCount: p.walks.length });
    } catch {
      /* skip unreadable entries */
    }
  }
  return out;
}

export function loadPreRestore(kv: KV, ts: string): State | null {
  try {
    const t = kv.getItem(PRE_RESTORE_PREFIX + ts);
    if (!t) return null;
    const p = JSON.parse(t);
    if (!p || !Array.isArray(p.walks)) return null;
    return normalizeState(p);
  } catch {
    return null;
  }
}

/* ── load / save ────────────────────────────────────────────── */

export interface LoadResult {
  state: State;
  /** Set when the main key was missing/corrupt and a snapshot was used. */
  healedFrom: string | null;
  /**
   * Set when the stored data was written by a NEWER app version.
   * The original text is preserved under FUTURE_KEY; the UI should warn
   * that saving from this version may drop newer fields.
   */
  futureSchema: number | null;
}

export function loadState(kv: KV): LoadResult {
  const mainText = kv.getItem(MAIN_KEY);

  const tryParse = (text: string | null): { state: State; schema: number | null } | null => {
    if (!text) return null;
    try {
      const p = JSON.parse(text);
      if (!p || typeof p !== "object" || !Array.isArray(p.walks)) return null;
      return { state: normalizeState(p), schema: schemaOf(p) };
    } catch {
      return null;
    }
  };

  const main = tryParse(mainText);
  if (main) {
    let futureSchema: number | null = null;
    if (main.schema != null && main.schema > CURRENT_SCHEMA) {
      futureSchema = main.schema;
      // preserve the newer version's exact bytes before this old code
      // can overwrite them with its reduced field set
      try {
        if (!kv.getItem(FUTURE_KEY) && mainText) kv.setItem(FUTURE_KEY, mainText);
      } catch {
        /* best-effort */
      }
    }
    return { state: main.state, healedFrom: null, futureSchema };
  }

  for (const date of readSnapIndex(kv)) {
    const snap = tryParse(kv.getItem(SNAP_PREFIX + date));
    if (snap) return { state: snap.state, healedFrom: date, futureSchema: null };
  }

  return { state: emptyState(), healedFrom: null, futureSchema: null };
}

export interface SaveOptions {
  /** Explicit user-initiated restore may legitimately empty the log. */
  allowEmpty?: boolean;
  /** "restore" additionally stashes the replaced state (undoable). */
  reason?: "restore";
  /** Injectable for tests; defaults to the real local date. */
  date?: string;
}

/**
 * Stash an unparseable main value. Two slots (current + previous). Under
 * quota pressure, prune the oldest snapshot and retry once; if the stash
 * still fails, proceed — saving the user's current data outranks
 * preserving corrupt bytes.
 */
function stashCorrupt(kv: KV, corruptText: string): void {
  try {
    const existing = kv.getItem(CORRUPT_KEY);
    if (existing != null && existing !== corruptText) {
      try {
        kv.setItem(CORRUPT_PREV_KEY, existing);
      } catch {
        /* keep going — the newer stash matters more */
      }
    }
    kv.setItem(CORRUPT_KEY, corruptText);
  } catch {
    // quota? free the oldest snapshot and retry once
    try {
      const index = readSnapIndex(kv);
      const oldest = index[index.length - 1];
      if (oldest) {
        kv.removeItem(SNAP_PREFIX + oldest);
        kv.setItem(SNAP_INDEX_KEY, JSON.stringify(index.slice(0, -1)));
        kv.setItem(CORRUPT_KEY, corruptText);
      }
    } catch {
      /* documented tradeoff: current data > corrupt forensics */
    }
  }
}

export function saveState(kv: KV, state: State, opts: SaveOptions = {}): void {
  const prevText = kv.getItem(MAIN_KEY);
  let prev: { walks: unknown[]; species?: unknown; records?: unknown } | null = null;
  let prevCorrupt = false;
  if (prevText) {
    try {
      const p = JSON.parse(prevText);
      prev = p && typeof p === "object" && Array.isArray(p.walks) ? p : null;
      prevCorrupt = !prev;
    } catch {
      prevCorrupt = true;
    }
  }

  // refuse-to-shrink: a write must never silently empty what was non-empty
  if (!opts.allowEmpty && prev) {
    if (prev.walks.length > 0 && state.walks.length === 0) {
      throw new StorageError(
        "Refusing to overwrite a non-empty log with an empty one. Use allowEmpty for an explicit restore.",
      );
    }
    if (Array.isArray(prev.species) && prev.species.length > 0 && state.species.length === 0) {
      throw new StorageError("Refusing to erase all species definitions.");
    }
    if (
      prev.records &&
      typeof prev.records === "object" &&
      Object.keys(prev.records).length > 0 &&
      Object.keys(state.records).length === 0
    ) {
      throw new StorageError("Refusing to erase all records.");
    }
  }

  // never discard an unparseable value — stash it for forensics
  if (prevCorrupt && prevText) {
    stashCorrupt(kv, prevText);
  }

  // a restore always preserves what it replaces, independent of the
  // once-per-day snapshot gate — this is what makes restores undoable
  if (opts.reason === "restore" && prevText && !prevCorrupt) {
    stashPreRestore(kv, prevText);
  }

  if (prev && !prevCorrupt && prevText) {
    snapshotDaily(kv, prevText, opts.date ?? today());
  }

  const text = JSON.stringify({
    schema: CURRENT_SCHEMA,
    walks: state.walks,
    species: state.species,
    records: state.records,
  });
  try {
    kv.setItem(MAIN_KEY, text);
  } catch {
    throw new StorageError(
      "Couldn't save to this device. Your walk is still on screen — try again in a moment.",
    );
  }
}

/* ── draft (the in-progress walk) ───────────────────────────── */

export const emptyDraft = (): Draft => ({
  date: today(),
  counts: {},
  road: 0,
  time: "",
  endTime: "",
  weather: null,
  note: "",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migration boundary
export function normalizeDraft(raw: any): Draft {
  const base = emptyDraft();
  if (!raw || typeof raw !== "object") return base;
  const counts: Record<string, number> = {};
  if (raw.counts && typeof raw.counts === "object") {
    for (const [k, v] of Object.entries(raw.counts)) {
      const n = cleanCount(v);
      if (n > 0) counts[k] = n;
    }
  }
  return {
    date: typeof raw.date === "string" && raw.date ? raw.date : base.date,
    counts,
    road: typeof raw.road === "number" ? Math.max(0, Math.round(raw.road)) : 0,
    time: typeof raw.time === "string" ? raw.time : "",
    endTime: typeof raw.endTime === "string" ? raw.endTime : "",
    weather: WEATHER_IDS.has(raw.weather) ? (raw.weather as WeatherId) : null,
    note: typeof raw.note === "string" ? raw.note : "",
  };
}

export function saveDraft(kv: KV, draft: Draft): void {
  try {
    kv.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* losing a draft is annoying, not catastrophic — never throw mid-walk */
  }
}

/** Only restores a draft from TODAY — yesterday's abandoned draft is stale. */
export function loadDraft(kv: KV): Draft | null {
  try {
    const t = kv.getItem(DRAFT_KEY);
    if (!t) return null;
    const p = JSON.parse(t);
    if (!p || p.date !== today()) return null;
    return normalizeDraft(p);
  } catch {
    return null;
  }
}

export function clearDraft(kv: KV): void {
  try {
    kv.removeItem(DRAFT_KEY);
  } catch {
    /* best-effort */
  }
}

/**
 * Backup and restore. Two forms:
 *  - clipboard JSON (ported from the prototype, same `v: 1` shape, so
 *    a backup copied out of the old artefact pastes straight in)
 *  - real files: download a .json, pick a file to restore
 *
 * serializeBackup/parseBackup are pure and tested; the download/pick
 * helpers are thin DOM wrappers.
 */
import type { State } from "../types";
import { CURRENT_SCHEMA, normalizeState, schemaOf, type KV } from "./storage";
import { today } from "./time";

/* ── export freshness (the "back up once in a while" nag) ───── */

export const LAST_EXPORT_KEY = "critter-counter/last-export";

export function markExported(kv: KV): void {
  try {
    kv.setItem(LAST_EXPORT_KEY, new Date().toISOString());
  } catch {
    /* best-effort */
  }
}

export function lastExportedAt(kv: KV): string | null {
  try {
    return kv.getItem(LAST_EXPORT_KEY);
  } catch {
    return null;
  }
}

/** Whole days since the ISO datetime; null when it never happened. */
export function daysSince(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now.getTime() - then) / 86400000));
}

export const BACKUP_VERSION = 1;

export function serializeBackup(state: State): string {
  return JSON.stringify({
    v: BACKUP_VERSION,
    schema: CURRENT_SCHEMA,
    exportedAt: new Date().toISOString(),
    walks: state.walks,
    species: state.species,
    records: state.records,
  });
}

export type BackupError = "invalid" | "future-schema";

export interface BackupParse {
  state: State | null;
  error: BackupError | null;
}

/**
 * Accepts this app's exports and the artefact prototype's clipboard
 * backups (same shape, minus schema/exportedAt). Refuses:
 *  - anything without a walks array ("invalid")
 *  - backups stamped by a NEWER schema ("future-schema") — importing one
 *    here would silently strip fields this version doesn't know about;
 *    the fix is updating the app, not a lossy import.
 */
export function parseBackup(text: string): BackupParse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { state: null, error: "invalid" };
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as { walks?: unknown }).walks)
  ) {
    return { state: null, error: "invalid" };
  }
  const schema = schemaOf(parsed);
  if (schema != null && schema > CURRENT_SCHEMA) {
    return { state: null, error: "future-schema" };
  }
  return { state: normalizeState(parsed), error: null };
}

export const backupFilename = (dateIso: string = today()): string =>
  `critter-counter-${dateIso}.json`;

/** Triggers a .json download via a temporary anchor. Browser only. */
export function downloadBackup(state: State): void {
  const blob = new Blob([serializeBackup(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  // revoke on a delay — iOS Safari can cancel the download if revoked synchronously
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Opens a file picker and resolves with the file's text (null if cancelled). */
export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then(resolve, () => resolve(null));
    };
    // iOS never fires change on cancel; the picker just closes and the
    // promise stays pending, which is harmless for our use.
    input.click();
  });
}

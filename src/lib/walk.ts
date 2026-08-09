/**
 * Draft → Walk, the spec's save-gate rule made pure:
 * "A walk can save on any one of counts, Bunny Road, or a time range."
 * Ported from the prototype's saveWalk so phase 2's UI can't quietly
 * diverge from it.
 */
import type { Draft, Walk } from "../types";
import { minsBetween, today } from "./time";
import { newWalkId } from "./id";

export interface DraftTotals {
  total: number;
  mins: number;
  road: number;
}

export const draftTotals = (draft: Draft): DraftTotals => ({
  total: Object.values(draft.counts || {}).reduce((a, b) => a + (b || 0), 0),
  mins: minsBetween(draft.time, draft.endTime),
  road: draft.road || 0,
});

/**
 * True when the draft has at least one of: sightings, road count, a time
 * range. Both ends stamped counts as a range even at zero minutes — the
 * timer's Start and Stop tapped within the same clock minute is still a
 * deliberately recorded walk (duration stores as null).
 */
export const isDraftSaveable = (draft: Draft): boolean => {
  const { total, mins, road } = draftTotals(draft);
  return Boolean(total || mins || road || (draft.time && draft.endTime));
};

/** The editable fields of a walk — a Draft minus the running-timer flag. */
export type WalkFields = Omit<Draft, "walking">;

/**
 * Builds a walk exactly as the prototype did: duration = mins || null,
 * falsy time/endTime → null, note trimmed, zero counts dropped. Shared
 * by saving a new walk (fresh id) and editing an old one (same id).
 *
 * `previous` is the walk being edited. It protects two legacy shapes:
 * - a stored duration WITHOUT times (schema-1 imports) survives edits
 *   that don't touch the time fields — deliberately clearing set times
 *   still clears it
 * - an emptied date falls back to the walk's own date, never "" (which
 *   would sort to the bottom and silently re-date to today on reload)
 */
export function buildWalk(id: string, fields: WalkFields, previous?: Walk): Walk {
  const { mins, road } = draftTotals(fields);
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(fields.counts || {})) {
    if (v > 0) counts[k] = v;
  }
  let duration = mins || null;
  const timesUntouched =
    previous != null &&
    (previous.time ?? "") === (fields.time || "") &&
    (previous.endTime ?? "") === (fields.endTime || "");
  if (duration == null && timesUntouched && previous.duration != null) {
    duration = previous.duration;
  }
  return {
    id,
    date: fields.date || previous?.date || today(),
    counts,
    road,
    duration,
    time: fields.time || null,
    endTime: fields.endTime || null,
    weather: fields.weather || null,
    note: fields.note.trim(),
  };
}

export function walkFromDraft(draft: Draft): Walk {
  return buildWalk(newWalkId(), draft);
}

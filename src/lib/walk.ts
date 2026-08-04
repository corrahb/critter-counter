/**
 * Draft → Walk, the spec's save-gate rule made pure:
 * "A walk can save on any one of counts, Bunny Road, or a time range."
 * Ported from the prototype's saveWalk so phase 2's UI can't quietly
 * diverge from it.
 */
import type { Draft, Walk } from "../types";
import { minsBetween } from "./time";
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

/** True when the draft has at least one of: sightings, road count, a time range. */
export const isDraftSaveable = (draft: Draft): boolean => {
  const { total, mins, road } = draftTotals(draft);
  return Boolean(total || mins || road);
};

/**
 * Builds the walk exactly as the prototype did: duration = mins || null,
 * falsy time/endTime → null, note trimmed, zero counts dropped.
 */
export function walkFromDraft(draft: Draft): Walk {
  const { mins, road } = draftTotals(draft);
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(draft.counts || {})) {
    if (v > 0) counts[k] = v;
  }
  return {
    id: newWalkId(),
    date: draft.date,
    counts,
    road,
    duration: mins || null,
    time: draft.time || null,
    endTime: draft.endTime || null,
    weather: draft.weather || null,
    note: draft.note.trim(),
  };
}

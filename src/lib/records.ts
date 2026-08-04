import type { Records, Species } from "../types";
import { countOf } from "./plural";
import { fmtMins } from "./time";

export interface RecordBeat {
  /** Updated records (same object values where nothing was beaten). */
  records: Records;
  /** Human messages for the toast, e.g. "26 rabbits", "12 on Bunny Road". */
  beaten: string[];
}

/**
 * The record-beating rules, extracted from the prototype's saveWalk:
 * - a species count beats its record only when STRICTLY greater
 * - Bunny Road and duration likewise
 * - a beaten record is stamped with the walk's date
 * - a species with no existing record is beaten by any n > 0
 * - duration only competes when the walk actually has minutes (mins > 0)
 */
export function applyWalkToRecords(args: {
  records: Records;
  species: Species[];
  counts: Record<string, number>;
  road: number;
  mins: number;
  date: string;
}): RecordBeat {
  const { records, species, counts, road, mins, date } = args;
  const next: Records = { ...records };
  const beaten: string[] = [];

  species.forEach((s) => {
    const n = counts[s.id] || 0;
    if (n > (next[s.id]?.value || 0)) {
      next[s.id] = { value: n, date };
      beaten.push(countOf(n, s.name));
    }
  });

  if (road > (next.road?.value || 0)) {
    next.road = { value: road, date };
    beaten.push(`${road} on Bunny Road`);
  }

  if (mins && mins > (next.duration?.value || 0)) {
    next.duration = { value: mins, date };
    beaten.push(`${fmtMins(mins)} walked`);
  }

  return { records: next, beaten };
}

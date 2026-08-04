/** Weather ids — must match WEATHER in data/constants.ts. */
export type WeatherId = "clear" | "cloudy" | "rain" | "snow" | "windy";

export interface Species {
  id: string;
  name: string;
  icon: string;
  custom?: boolean;
}

/**
 * A saved walk. Normalized shape: `road` is always a number (legacy
 * per-species road objects are summed on import) and `id` is always a
 * string (legacy Date.now() numeric ids are stringified on import).
 */
export interface Walk {
  id: string;
  date: string; // ISO YYYY-MM-DD
  counts: Record<string, number>;
  /** Bunnies on Bunny Road — fully independent of counts.rabbit. */
  road: number;
  /** Minutes, derived from time→endTime; stored for stats. */
  duration: number | null;
  time: string | null; // HH:MM
  endTime: string | null; // HH:MM
  weather: WeatherId | null;
  note: string;
}

/** The in-progress walk on the Tonight tab. */
export interface Draft {
  date: string;
  counts: Record<string, number>;
  road: number;
  time: string;
  endTime: string;
  weather: WeatherId | null;
  note: string;
}

/** A personal best. Key is a species id, "road", or "duration". */
export interface RecordEntry {
  value: number;
  date: string | null;
}

export type Records = Record<string, RecordEntry>;

/** Everything the app persists (walks + species + records). */
export interface State {
  walks: Walk[];
  species: Species[];
  records: Records;
}

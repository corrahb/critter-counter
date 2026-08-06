/** Minutes → "1h 30m" / "45m" / "—". */
export const fmtMins = (m: number | null | undefined): string => {
  const n = Math.max(0, Math.round(m || 0));
  if (!n) return "—";
  const h = Math.floor(n / 60);
  const mm = n % 60;
  if (!h) return `${mm}m`;
  return mm ? `${h}h ${mm}m` : `${h}h`;
};

/** "19:15" → "7:15 pm". */
export const fmtTime = (t: string | null | undefined): string => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
};

/** "23:40" + 45 → "00:25" (wraps midnight). Empty when either input is falsy. */
export const addMins = (t: string | null | undefined, mins: number | null | undefined): string => {
  if (!t || !mins) return "";
  const [h, m] = t.split(":").map(Number);
  const total = (h * 60 + m + mins) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/** Walk length from start and end, wrapping if the walk crosses midnight. */
export const minsBetween = (start: string | null | undefined, end: string | null | undefined): number => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 1440;
  return diff;
};

/** 19 → "7 pm". */
export const hourLabel = (h: number): string => {
  const ap = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${ap}`;
};

/**
 * Today's date in the LOCAL timezone.
 *
 * The prototype used new Date().toISOString().slice(0, 10), which is UTC —
 * in a UTC-negative timezone every evening walk after 7/8 pm was stamped
 * with TOMORROW's date. This app is used in the evening, so that was wrong
 * most nights it was used.
 */
const localISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const today = (): string => localISO(new Date());

/** Yesterday's LOCAL date — the grace window for a walk that crossed midnight. */
export const yesterday = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localISO(d);
};

/** "2026-08-04" → "Tue, Aug 4" (locale-aware). */
export const prettyDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

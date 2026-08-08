/**
 * The living sky: where tonight sits on the day→dusk→night slide.
 * Blend t runs 0 (full day) → 1 (sunset) → 2 (full night):
 *   day until 90 min before sunset, night from 60 min after,
 *   smooth in between. With no location, a per-season Ontario-ish
 *   approximation stands in so winter isn't "daylight" at 6 pm.
 */
import type { Season } from "./season";

/** Linear mix of two hex colors, t clamped to [0,1]. */
export function mixHex(a: string, b: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const out = pa.map((v, i) => Math.round(v + (pb[i] - v) * clamped));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Three-stop blend: t in [0..2] across [day, dusk, night]. */
export const mix3 = (day: string, dusk: string, night: string, t: number): string =>
  t <= 1 ? mixHex(day, dusk, t) : mixHex(dusk, night, t - 1);

/** Rough southern-Ontario sunset minutes when no location is cached. */
const APPROX_SUNSET_MIN: Record<Season, number> = {
  winter: 17 * 60,
  spring: 20 * 60,
  summer: 20 * 60 + 45,
  autumn: 19 * 60,
};

/**
 * 0 = full day, 1 = sunset, 2 = full night. Early-morning hours count
 * as night (this is an evening app; dawn can stay poetic, not modeled).
 */
export function dayBlend(season: Season, sunset: Date | null, now: Date = new Date()): number {
  const sunsetMin = sunset
    ? sunset.getHours() * 60 + sunset.getMinutes()
    : APPROX_SUNSET_MIN[season];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let d = nowMin - sunsetMin;
  // past midnight is a continuation of the evening, not tomorrow's day —
  // and the wrap is symmetric so a sunset landing after local midnight
  // (high latitudes, stale coords across timezones) keeps the evening
  // BEFORE it as approaching-day rather than snapping to full night
  if (d < -720) d += 1440;
  if (d > 720) d -= 1440;
  if (d <= -90) return 0;
  if (d < 0) return (d + 90) / 90;
  if (d >= 60) return 2;
  return 1 + d / 60;
}

export type SkyPhase = "day" | "golden" | "dusk" | "night";

export const phaseOf = (t: number): SkyPhase =>
  t <= 0.15 ? "day" : t < 0.85 ? "golden" : t < 1.6 ? "dusk" : "night";

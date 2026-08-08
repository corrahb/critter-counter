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

/* ── the scene: season × blend × weather → paintable header ────
   TWO text regimes with one deliberate flip at blend 0.5 ("dusk
   falls", 45 min before sunset): a light sunlit sky with dark ink
   before it, the dark forest with cream text after. The flip exists
   because mid-tone skies can't carry EITHER text color at 4.5:1 —
   every color here is swept by tools/contrast-check.mjs (worst
   combination 4.73:1); change palette and check only together. */
import type { WeatherId } from "../types";

type ParticleKind = "petal" | "firefly" | "leaf" | "snow" | "rain";

interface SeasonSpec {
  skyDay: string;
  skyGold: string;
  skyDuskWarm: string;
  skyDusk: string;
  skyNight: string;
  back: string;
  front: string;
  particle: string;
  glow: boolean;
  kind: ParticleKind;
  count: number;
}

export const INK = "#14281C";
const EYEBROW_DARK = "#A9C5B4";
const CREAM = "#F0EBDA";

const SEASON_SPECS: Record<Season, SeasonSpec> = {
  spring: {
    skyDay: "#A7CBB0", skyGold: "#8FB183", skyDuskWarm: "#2C5138", skyDusk: "#244831", skyNight: "#0D1B13",
    back: "#16341F", front: "#0F2917", particle: "#F4A7B9", glow: false, kind: "petal", count: 7,
  },
  summer: {
    skyDay: "#9CC3A8", skyGold: "#85A87E", skyDuskWarm: "#284A33", skyDusk: "#1E4232", skyNight: "#0A1710",
    back: "#132C1F", front: "#0D2115", particle: "#E4E98A", glow: true, kind: "firefly", count: 6,
  },
  autumn: {
    skyDay: "#C9B891", skyGold: "#B59A6B", skyDuskWarm: "#4A3A20", skyDusk: "#453522", skyNight: "#150F08",
    back: "#2E2414", front: "#20190D", particle: "#D08A4E", glow: false, kind: "leaf", count: 7,
  },
  winter: {
    skyDay: "#A7BECB", skyGold: "#8FA5AC", skyDuskWarm: "#2E4450", skyDusk: "#293A44", skyNight: "#0C1319",
    back: "#1B2A31", front: "#122028", particle: "#F0EBDA", glow: false, kind: "snow", count: 9,
  },
};

export interface Scene {
  sky: string;
  back: string;
  front: string;
  particle: string;
  glow: boolean;
  kind: ParticleKind;
  count: number;
  windy: boolean;
  stars: boolean;
  /** Light regime: sunlit sky, dark ink text. */
  light: boolean;
  sun: boolean;
  moon: boolean;
  textPrimary: string;
  textEyebrow: string;
}

export function sceneFor(season: Season, blend: number, weather: WeatherId | null): Scene {
  const s = SEASON_SPECS[season];
  const light = blend < 0.5;

  let sky: string;
  let back: string;
  let front: string;
  if (light) {
    sky = mixHex(s.skyDay, s.skyGold, blend * 2);
    // sunlit trees: strongly lifted toward daylight green
    back = mixHex(s.back, "#6F9A7E", 0.45 - blend * 0.3);
    front = mixHex(s.front, "#6F9A7E", 0.32 - blend * 0.2);
  } else {
    sky = mix3(s.skyDuskWarm, s.skyDusk, s.skyNight, ((blend - 0.5) * 4) / 3);
    const nightT = Math.max(0, blend - 1);
    back = mixHex(s.back, "#000000", nightT * 0.4);
    front = mixHex(s.front, "#000000", nightT * 0.4);
  }

  let kind = s.kind;
  let particle = s.particle;
  let glow = s.glow;
  let count = s.count;
  let windy = false;

  // weather targets differ per regime: mid greys keep a light sky
  // ink-safe, dark greys keep a dark sky cream-safe (see the sweep)
  if (weather === "cloudy") {
    sky = mixHex(sky, light ? "#9AA29C" : "#454E4A", 0.35);
    back = mixHex(back, light ? "#7C8580" : "#3A423E", 0.2);
    front = mixHex(front, light ? "#7C8580" : "#3A423E", 0.15);
    count = Math.ceil(count / 2);
  } else if (weather === "rain") {
    sky = mixHex(sky, light ? "#8C9AA1" : "#333F46", 0.35);
    back = mixHex(back, light ? "#6E7C83" : "#2C363C", 0.25);
    front = mixHex(front, light ? "#6E7C83" : "#2C363C", 0.18);
    kind = "rain";
    particle = light ? "#5F7783" : "#9FB8C4";
    glow = false;
    count = 11;
  } else if (weather === "snow") {
    sky = mixHex(sky, light ? "#AAB4BA" : "#46525A", 0.25);
    kind = "snow";
    particle = light ? "#FDFDFA" : "#F0EBDA";
    glow = false;
    count = 10;
  } else if (weather === "windy") {
    windy = true;
  }

  // fireflies only come out around dusk; sun needs a visible sky;
  // stars and the moon only on clear nights
  if (kind === "firefly" && blend < 0.85) count = 0;
  const clearish = weather == null || weather === "clear" || weather === "windy";
  const night = phaseOf(blend) === "night";

  return {
    sky, back, front, particle, glow, kind, count, windy,
    stars: night && clearish,
    light,
    sun: light && clearish,
    moon: night && clearish,
    textPrimary: light ? INK : CREAM,
    textEyebrow: light ? INK : EYEBROW_DARK,
  };
}

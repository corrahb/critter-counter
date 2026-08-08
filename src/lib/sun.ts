/**
 * Sunset from latitude/longitude and the date — NOAA's solar position
 * approximation, computed entirely on-device (the spec forbids APIs).
 * Accuracy is ~1 minute at temperate latitudes, which is plenty for
 * "is it a good time to walk".
 */
const RAD = Math.PI / 180;

const dayOfYear = (y: number, m: number, d: number): number => {
  const start = Date.UTC(y, 0, 1);
  return Math.floor((Date.UTC(y, m - 1, d) - start) / 86400000) + 1;
};

/**
 * The moment of sunset for the local calendar date, or null where the
 * sun doesn't set that day (polar day/night — not an Ontario problem,
 * but the math must not lie at the poles).
 */
export function sunsetAt(lat: number, lon: number, dateISO: string): Date | null {
  const [y, m, d] = dateISO.split("-").map(Number);
  if (!y || !m || !d) return null;

  const doy = dayOfYear(y, m, d);
  const gamma = ((2 * Math.PI) / 365) * (doy - 1 + 0.5);

  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latR = lat * RAD;
  // 90.833° accounts for refraction + the solar disc's radius
  const cosHa = Math.cos(90.833 * RAD) / (Math.cos(latR) * Math.cos(decl)) - Math.tan(latR) * Math.tan(decl);
  if (cosHa < -1 || cosHa > 1) return null;

  const ha = Math.acos(cosHa) / RAD; // degrees
  // NOAA: minutes-UTC = 720 − 4·(lon + hourAngle) − eqtime, sunset uses −ha
  const minutesUTC = 720 - 4 * (lon - ha) - eqtime;

  return new Date(Date.UTC(y, m - 1, d) + minutesUTC * 60000);
}

/** Sunset as local "HH:MM" for direct display, or null. */
export function sunsetHHMM(lat: number, lon: number, dateISO: string): string | null {
  const s = sunsetAt(lat, lon, dateISO);
  if (!s) return null;
  return `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
}

export type DuskPhase = "before" | "prime" | "after";

/**
 * Where "now" falls relative to sunset: prime critter hours run from an
 * hour before sunset to two hours after.
 */
export function duskPhase(sunset: Date, now: Date = new Date()): DuskPhase {
  const diffMin = (now.getTime() - sunset.getTime()) / 60000;
  if (diffMin < -60) return "before";
  if (diffMin <= 120) return "prime";
  return "after";
}

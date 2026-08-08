/**
 * Vibration on Android Chrome; silently nothing where unsupported.
 * Kept tiny and tasteful — a tally tap is a tick, not an earthquake.
 */
const buzz = (pattern: number | number[]): void => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* never let a buzz break a tap */
  }
};

/** One counted critter. */
export const tapBuzz = (): void => buzz(12);

/** Walk timer started or stopped. */
export const timerBuzz = (): void => buzz(35);

/** A personal record fell. */
export const recordBuzz = (): void => buzz([15, 60, 25]);

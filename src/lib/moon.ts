/**
 * Moon phase from the date alone — nothing to enter, no API.
 * Synodic approximation anchored to the 2000-01-06 18:14 UTC new moon.
 * Verified against four eclipse dates (see the spec + tests).
 * Decoration, not analysis.
 */
export interface MoonPhase {
  icon: string;
  name: string;
}

export const MOONS: MoonPhase[] = [
  { icon: "🌑", name: "New moon" },
  { icon: "🌒", name: "Waxing crescent" },
  { icon: "🌓", name: "First quarter" },
  { icon: "🌔", name: "Waxing gibbous" },
  { icon: "🌕", name: "Full moon" },
  { icon: "🌖", name: "Waning gibbous" },
  { icon: "🌗", name: "Last quarter" },
  { icon: "🌘", name: "Waning crescent" },
];

const SYNODIC = 29.530588853;

export const moonOf = (iso: string | null | undefined): MoonPhase => {
  if (!iso) return MOONS[0];
  const [y, m, d] = iso.split("-").map(Number);
  const days = Date.UTC(y, m - 1, d, 21) / 86400000;
  const ref = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const age = (((days - ref) % SYNODIC) + SYNODIC) % SYNODIC;
  return MOONS[Math.floor((age / SYNODIC) * 8 + 0.5) % 8];
};

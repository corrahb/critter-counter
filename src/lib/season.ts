/**
 * Season from the local date — meteorological seasons, northern
 * hemisphere (this app walks in Ontario). Like the moon: computed,
 * never stored.
 */
export type Season = "spring" | "summer" | "autumn" | "winter";

export const SEASONS: { id: Season; icon: string; label: string }[] = [
  { id: "spring", icon: "🌸", label: "Spring" },
  { id: "summer", icon: "✨", label: "Summer" },
  { id: "autumn", icon: "🍂", label: "Autumn" },
  { id: "winter", icon: "❄️", label: "Winter" },
];

export const seasonOf = (dateISO: string): Season => {
  const m = Number(dateISO.split("-")[1]);
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
};

import type { Records, Species, WeatherId } from "../types";

export const DEFAULT_SPECIES: Species[] = [
  { id: "rabbit", name: "Rabbit", icon: "🐇" },
  { id: "raccoon", name: "Raccoon", icon: "🦝" },
  { id: "turkey", name: "Wild turkey", icon: "🦃" },
  { id: "cat", name: "Cat", icon: "🐈" },
];

/** Emoji picker for custom critters. */
export const ICONS = ["🦌", "🦊", "🦨", "🐿️", "🦫", "🐦", "🦉", "🦆", "🐸", "🐢", "🦇", "🐺", "🦡", "🐻"];

/** Standing bests — editable, and beaten automatically by a logged walk. */
export const SEED_RECORDS: Records = {
  rabbit: { value: 25, date: "2026-07-24" },
  road: { value: 11, date: "2026-08-02" },
  turkey: { value: 2, date: null },
  raccoon: { value: 2, date: null },
  duration: { value: 90, date: null },
};

export interface WeatherOption {
  id: WeatherId;
  icon: string;
  label: string;
}

export const WEATHER: WeatherOption[] = [
  { id: "clear", icon: "☀️", label: "Clear" },
  { id: "cloudy", icon: "☁️", label: "Cloudy" },
  { id: "rain", icon: "🌧", label: "Rain" },
  { id: "snow", icon: "❄️", label: "Snow" },
  { id: "windy", icon: "💨", label: "Windy" },
];

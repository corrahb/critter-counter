import type { Walk } from "../types";
import { WEATHER, type WeatherOption } from "../data/constants";

/** Sum of an object's numeric values (null-tolerant). */
export const sum = (obj: Record<string, number> | null | undefined): number =>
  Object.values(obj || {}).reduce((a, b) => a + (b || 0), 0);

export interface HourRow {
  h: number;
  avg: number;
  n: number;
}

export interface WeatherRow extends WeatherOption {
  avg: number;
  n: number;
}

export interface Stats {
  totalCritters: number;
  totalMins: number;
  perSpecies: Record<string, number>;
  best: Walk | null;
  rab: number;
  roadTotal: number;
  roadNights: number;
  bestRoad: Walk | null;
  hourRows: HourRow[];
  weatherRows: WeatherRow[];
}

/**
 * All Patterns-tab numbers. Walks are normalized before they get here,
 * so w.road is always a number.
 */
export function computeStats(walks: Walk[]): Stats {
  const totalCritters = walks.reduce((a, w) => a + sum(w.counts), 0);
  const totalMins = walks.reduce((a, w) => a + (w.duration || 0), 0);

  const perSpecies: Record<string, number> = {};
  walks.forEach((w) => {
    Object.entries(w.counts || {}).forEach(([k, v]) => {
      perSpecies[k] = (perSpecies[k] || 0) + v;
    });
  });

  const best = walks.reduce<Walk | null>(
    (b, w) => (sum(w.counts) > sum(b?.counts || {}) ? w : b),
    null,
  );
  const roadTotal = walks.reduce((a, w) => a + w.road, 0);
  const roadNights = walks.filter((w) => w.road > 0).length;
  const bestRoad = walks.reduce<Walk | null>((b, w) => (w.road > (b?.road ?? 0) ? w : b), null);
  const rab = perSpecies["rabbit"] || 0;

  const byHour: Record<number, { n: number; c: number }> = {};
  const byWeather: Record<string, { n: number; c: number }> = {};
  walks.forEach((w) => {
    const c = sum(w.counts);
    if (w.time) {
      const h = parseInt(w.time.slice(0, 2), 10);
      if (!byHour[h]) byHour[h] = { n: 0, c: 0 };
      byHour[h].n++;
      byHour[h].c += c;
    }
    if (w.weather) {
      if (!byWeather[w.weather]) byWeather[w.weather] = { n: 0, c: 0 };
      byWeather[w.weather].n++;
      byWeather[w.weather].c += c;
    }
  });

  const hourRows: HourRow[] = Object.entries(byHour)
    .map(([h, v]) => ({ h: Number(h), avg: v.c / v.n, n: v.n }))
    .sort((a, b) => a.h - b.h);

  const weatherRows: WeatherRow[] = Object.entries(byWeather)
    .flatMap(([id, v]) => {
      const opt = WEATHER.find((x) => x.id === id);
      return opt ? [{ ...opt, avg: v.c / v.n, n: v.n }] : [];
    })
    .sort((a, b) => b.avg - a.avg);

  return {
    totalCritters,
    totalMins,
    perSpecies,
    best,
    rab,
    roadTotal,
    roadNights,
    bestRoad,
    hourRows,
    weatherRows,
  };
}

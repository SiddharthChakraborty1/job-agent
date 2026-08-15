import type { UnscoredJobResult, ValidatedJobResult } from '../types';

export interface SavedRun {
  savedAt: string;
  cities: string[];
  /** @deprecated older saves used a single city string */
  city?: string;
  validated: ValidatedJobResult[];
  unscored: UnscoredJobResult[];
  warnings: string[];
}

export const MAX_CITIES = 5;

const runKey = (userSub: string) => `job-finder:last-run:${userSub}`;
const cityKey = (userSub: string) => `job-finder:preferred-city:${userSub}`;

function uniqueCities(values: string[]): string[] {
  const seen = new Set<string>();
  const cities: string[] = [];
  for (const value of values) {
    const city = value.trim();
    const key = city.toLowerCase();
    if (!city || seen.has(key)) continue;
    seen.add(key);
    cities.push(city);
    if (cities.length >= MAX_CITIES) break;
  }
  return cities;
}

export function parseCities(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueCities(value.filter((item): item is string => typeof item === 'string'));
  }
  if (typeof value === 'string' && value.trim()) {
    return uniqueCities(value.split(/[,;]/));
  }
  return [];
}

export function loadLastRun(userSub: string): SavedRun | null {
  try {
    const raw = localStorage.getItem(runKey(userSub));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedRun;
    if (!parsed || !Array.isArray(parsed.validated) || !Array.isArray(parsed.unscored)) {
      return null;
    }
    return {
      ...parsed,
      cities: parseCities(parsed.cities?.length ? parsed.cities : parsed.city),
    };
  } catch {
    return null;
  }
}

export function saveLastRun(userSub: string, run: SavedRun): void {
  try {
    const cities = parseCities(run.cities);
    localStorage.setItem(runKey(userSub), JSON.stringify({ ...run, cities }));
    savePreferredCities(userSub, cities);
  } catch {
    // private mode / quota — ignore
  }
}

export function loadPreferredCities(userSub: string): string[] {
  try {
    const raw = localStorage.getItem(cityKey(userSub));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      const fromJson = parseCities(parsed);
      if (fromJson.length > 0) return fromJson;
    } catch {
      // stored as a plain comma-separated string
    }
    return parseCities(raw);
  } catch {
    return [];
  }
}

export function savePreferredCities(userSub: string, cities: string[]): void {
  try {
    const next = parseCities(cities);
    if (next.length > 0) {
      localStorage.setItem(cityKey(userSub), JSON.stringify(next));
    } else {
      localStorage.removeItem(cityKey(userSub));
    }
  } catch {
    // ignore
  }
}

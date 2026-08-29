import type { UnscoredJobResult, ValidatedJobResult, SkillGap } from '../types';

export interface SavedRun {
  savedAt: string;
  cities: string[];
  /** @deprecated older saves used a single city string */
  city?: string;
  validated: ValidatedJobResult[];
  unscored: UnscoredJobResult[];
  warnings: string[];
  skillGaps?: SkillGap[];
  /** Job URLs that were new vs the previous saved run (empty on first run). */
  newJobUrls?: string[];
  /** How many new URLs vs the previous run; null when no prior run to compare. */
  newSinceLastCount?: number | null;
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

function allUrls(validated: ValidatedJobResult[], unscored: UnscoredJobResult[]): string[] {
  return [...validated, ...unscored].map((job) => job.job_url);
}

/** Compare a new result set against a previous saved run; returns new URLs. */
export function diffNewJobUrls(
  previous: SavedRun | null,
  validated: ValidatedJobResult[],
  unscored: UnscoredJobResult[]
): { newJobUrls: string[]; newSinceLastCount: number | null } {
  if (!previous) {
    return { newJobUrls: [], newSinceLastCount: null };
  }
  const prior = new Set(allUrls(previous.validated, previous.unscored));
  const newJobUrls = allUrls(validated, unscored).filter((url) => !prior.has(url));
  return { newJobUrls, newSinceLastCount: newJobUrls.length };
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
      skillGaps: Array.isArray(parsed.skillGaps) ? parsed.skillGaps : [],
      newJobUrls: Array.isArray(parsed.newJobUrls) ? parsed.newJobUrls : [],
      newSinceLastCount:
        typeof parsed.newSinceLastCount === 'number' ? parsed.newSinceLastCount : null,
    };
  } catch {
    return null;
  }
}

export function saveLastRun(userSub: string, run: SavedRun): void {
  try {
    const cities = parseCities(run.cities);
    localStorage.setItem(
      runKey(userSub),
      JSON.stringify({
        ...run,
        cities,
        skillGaps: run.skillGaps ?? [],
        newJobUrls: run.newJobUrls ?? [],
        newSinceLastCount: run.newSinceLastCount ?? null,
      })
    );
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

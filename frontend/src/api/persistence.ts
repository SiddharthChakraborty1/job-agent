import type { ApplicationStatus } from '../storage/applicationStatus';
import type { SkillGap, UnscoredJobResult, ValidatedJobResult } from '../types';
import { apiUrl } from './config';

export interface SavedRunDto {
  id: string;
  savedAt: string;
  cities: string[];
  validated: ValidatedJobResult[];
  unscored: UnscoredJobResult[];
  warnings: string[];
  skillGaps: SkillGap[];
  newJobUrls: string[];
  newSinceLastCount: number | null;
}

async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  if (!text) return `Server error ${response.status}`;
  try {
    const json = JSON.parse(text) as { detail?: unknown };
    if (typeof json.detail === 'string') return json.detail;
  } catch {
    // fall through
  }
  return text;
}

export interface SavedRunSummaryDto {
  id: string;
  savedAt: string;
  cities: string[];
  validatedCount: number;
  unscoredCount: number;
  newSinceLastCount: number | null;
  warnings: string[];
}

export async function fetchRunSummaries(
  limit = 20,
  signal?: AbortSignal
): Promise<SavedRunSummaryDto[]> {
  const response = await fetch(apiUrl(`/api/runs?limit=${limit}`), {
    credentials: 'include',
    signal,
  });
  if (response.status === 503) {
    throw new Error(
      'Cloud storage is not configured on the server. Check Render Firebase env vars and redeploy.'
    );
  }
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as SavedRunSummaryDto[];
}

export async function fetchRun(
  runId: string,
  signal?: AbortSignal
): Promise<SavedRunDto | null> {
  const response = await fetch(apiUrl(`/api/runs/${encodeURIComponent(runId)}`), {
    credentials: 'include',
    signal,
  });
  if (response.status === 404 || response.status === 503) return null;
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as SavedRunDto;
}

export async function fetchLatestRun(signal?: AbortSignal): Promise<SavedRunDto | null> {
  const response = await fetch(apiUrl('/api/runs/latest'), {
    credentials: 'include',
    signal,
  });
  if (response.status === 503) return null;
  if (!response.ok) throw new Error(await readError(response));
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text || text === 'null') return null;
  return JSON.parse(text) as SavedRunDto;
}

export async function fetchStatuses(
  signal?: AbortSignal
): Promise<Record<string, ApplicationStatus>> {
  const response = await fetch(apiUrl('/api/statuses'), {
    credentials: 'include',
    signal,
  });
  if (response.status === 503) return {};
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as { statuses?: Record<string, ApplicationStatus> };
  return data.statuses ?? {};
}

export async function updateStatusRemote(
  jobUrl: string,
  status: ApplicationStatus
): Promise<Record<string, ApplicationStatus>> {
  const response = await fetch(apiUrl('/api/statuses'), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_url: jobUrl, status }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as { statuses?: Record<string, ApplicationStatus> };
  return data.statuses ?? {};
}

export async function fetchPreferredCities(signal?: AbortSignal): Promise<string[]> {
  const response = await fetch(apiUrl('/api/preferences/cities'), {
    credentials: 'include',
    signal,
  });
  if (response.status === 503) return [];
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as { cities?: string[] };
  return data.cities ?? [];
}

export async function savePreferredCitiesRemote(cities: string[]): Promise<string[]> {
  const response = await fetch(apiUrl('/api/preferences/cities'), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cities }),
  });
  if (response.status === 503) return cities;
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as { cities?: string[] };
  return data.cities ?? cities;
}

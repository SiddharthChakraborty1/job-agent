import type { SavedRunDto, SavedRunSummaryDto } from './persistence';
import { apiUrl } from './config';

export interface AdminUserSummary {
  sub: string;
  email: string;
  name: string;
  picture?: string | null;
  preferredCities: string[];
  lastLoginAt: string | null;
  createdAt: string | null;
  searchCount: number;
  lastSearchAt: string | null;
}

export interface AdminUserDetail extends AdminUserSummary {
  runs: SavedRunSummaryDto[];
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

export async function fetchAdminUsers(signal?: AbortSignal): Promise<AdminUserSummary[]> {
  const response = await fetch(apiUrl('/api/admin/users'), {
    credentials: 'include',
    signal,
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as AdminUserSummary[];
}

export async function fetchAdminUser(
  userSub: string,
  signal?: AbortSignal
): Promise<AdminUserDetail> {
  const response = await fetch(apiUrl(`/api/admin/users/${encodeURIComponent(userSub)}`), {
    credentials: 'include',
    signal,
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as AdminUserDetail;
}

export async function fetchAdminUserRun(
  userSub: string,
  runId: string,
  signal?: AbortSignal
): Promise<SavedRunDto> {
  const response = await fetch(
    apiUrl(
      `/api/admin/users/${encodeURIComponent(userSub)}/runs/${encodeURIComponent(runId)}`
    ),
    { credentials: 'include', signal }
  );
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as SavedRunDto;
}

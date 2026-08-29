export type ApplicationStatus = 'not_applied' | 'applied' | 'interviewing' | 'rejected';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'not_applied',
  'applied',
  'interviewing',
  'rejected',
];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  not_applied: 'Not Applied',
  applied: 'Applied',
  interviewing: 'Interviewing',
  rejected: 'Rejected',
};

const statusKey = (userSub: string) => `job-finder:app-status:${userSub}`;

function isStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && APPLICATION_STATUSES.includes(value as ApplicationStatus);
}

export function loadApplicationStatuses(userSub: string): Record<string, ApplicationStatus> {
  try {
    const raw = localStorage.getItem(statusKey(userSub));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, ApplicationStatus> = {};
    for (const [url, status] of Object.entries(parsed)) {
      if (isStatus(status)) out[url] = status;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveApplicationStatuses(
  userSub: string,
  statuses: Record<string, ApplicationStatus>
): void {
  try {
    // Drop default "not_applied" to keep storage small.
    const compact: Record<string, ApplicationStatus> = {};
    for (const [url, status] of Object.entries(statuses)) {
      if (status !== 'not_applied') compact[url] = status;
    }
    if (Object.keys(compact).length === 0) {
      localStorage.removeItem(statusKey(userSub));
    } else {
      localStorage.setItem(statusKey(userSub), JSON.stringify(compact));
    }
  } catch {
    // ignore
  }
}

export function setApplicationStatus(
  userSub: string,
  jobUrl: string,
  status: ApplicationStatus
): Record<string, ApplicationStatus> {
  const current = loadApplicationStatuses(userSub);
  if (status === 'not_applied') {
    delete current[jobUrl];
  } else {
    current[jobUrl] = status;
  }
  saveApplicationStatuses(userSub, current);
  return current;
}

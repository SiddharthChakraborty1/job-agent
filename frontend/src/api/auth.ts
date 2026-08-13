import type { User } from '../types/auth';
import { apiUrl } from './config';

async function extractErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  if (!text) return `Server error ${response.status}`;

  try {
    const json = JSON.parse(text) as { detail?: unknown };
    if (typeof json.detail === 'string') return json.detail;
  } catch {
    // not JSON
  }

  return text;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const response = await fetch(apiUrl('/api/auth/me'), {
    credentials: 'include',
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return (await response.json()) as User;
}

export async function loginWithGoogle(credential: string): Promise<User> {
  const response = await fetch(apiUrl('/api/auth/google'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ credential }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return (await response.json()) as User;
}

export async function logout(): Promise<void> {
  const response = await fetch(apiUrl('/api/auth/logout'), {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
}

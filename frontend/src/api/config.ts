/** Backend origin in production (e.g. https://your-api.onrender.com). Empty in local dev → Vite proxy. */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

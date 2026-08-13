/** Backend origin in production (e.g. https://your-api.onrender.com). Empty in local dev → Vite proxy. */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

function assertApiBaseConfigured(): void {
  if (API_BASE) return;
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocal) return;

  throw new Error(
    'VITE_API_URL is not set. In Vercel → Settings → Environment Variables, set it to your Render URL (e.g. https://your-api.onrender.com), then redeploy.',
  );
}

export function apiUrl(path: string): string {
  assertApiBaseConfigured();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

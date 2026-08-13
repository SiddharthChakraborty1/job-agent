import type { PipelineEvent } from '../types';
import { apiUrl } from './config';

async function extractErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  if (!text) return `Server error ${response.status}`;

  try {
    const json = JSON.parse(text) as { detail?: unknown };
    if (typeof json.detail === 'string') return json.detail;
    if (Array.isArray(json.detail)) {
      return json.detail
        .map((item) => (typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item)))
        .join('; ');
    }
  } catch {
    // not JSON — fall through
  }

  return text;
}

/**
 * Upload a resume file and stream pipeline events from the backend via SSE.
 * Yields PipelineEvent objects as they arrive.
 */
export async function* analyzeResume(file: File): AsyncGenerator<PipelineEvent> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(apiUrl('/api/analyze'), {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  const body = response.body;
  if (!body) {
    throw new Error('Response body is null');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        if (!frame.trim()) continue;

        let eventType = 'message';
        let dataStr = '';

        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) {
            eventType = line.slice('event:'.length).trim();
          } else if (line.startsWith('data:')) {
            dataStr = line.slice('data:'.length).trim();
          }
        }

        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr) as Record<string, unknown>;
          yield {
            event: eventType,
            message: typeof parsed.message === 'string' ? parsed.message : undefined,
            data: parsed.data !== undefined ? parsed.data : parsed,
          } as PipelineEvent;
        } catch {
          console.warn('Failed to parse SSE data:', dataStr);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeResume } from '../api/client';
import type { PipelineResponse, ValidatedJobResult, UnscoredJobResult } from '../types';

export type StreamStatus = 'idle' | 'running' | 'done' | 'error';

export interface PipelineStreamState {
  status: StreamStatus;
  progress: string;
  validated: ValidatedJobResult[];
  unscored: UnscoredJobResult[];
  warnings: string[];
  error: string | null;
  startStream: (file: File) => void;
  dismissError: () => void;
  reset: () => void;
}

export function usePipelineStream(): PipelineStreamState {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [progress, setProgress] = useState('');
  const [validated, setValidated] = useState<ValidatedJobResult[]>([]);
  const [unscored, setUnscored] = useState<UnscoredJobResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef(false);
  const runIdRef = useRef(0);

  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  const reset = useCallback(() => {
    runIdRef.current += 1;
    abortRef.current = true;
    setStatus('idle');
    setProgress('');
    setValidated([]);
    setUnscored([]);
    setWarnings([]);
    setError(null);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
    setStatus('idle');
  }, []);

  const startStream = useCallback((file: File) => {
    const runId = ++runIdRef.current;
    abortRef.current = false;
    setStatus('running');
    setProgress('');
    setValidated([]);
    setUnscored([]);
    setWarnings([]);
    setError(null);

    void (async () => {
      try {
        const generator = analyzeResume(file);
        for await (const event of generator) {
          if (abortRef.current || runId !== runIdRef.current) break;

          switch (event.event) {
            case 'progress':
              setProgress(event.message ?? '');
              break;

            case 'warning':
              setWarnings((prev) => [...prev, event.message ?? '']);
              break;

            case 'done': {
              const data = event.data as PipelineResponse | undefined;
              if (data) {
                setValidated(data.validated ?? []);
                setUnscored(data.unscored ?? []);
                // Prefer warnings from the done payload (already includes all),
                // falling back to any streamed warning frames.
                setWarnings((prev) => {
                  const fromDone = data.warnings ?? [];
                  return fromDone.length > 0 ? fromDone : prev;
                });
              }
              setStatus('done');
              break;
            }

            case 'error':
              setError(event.message ?? 'An unknown error occurred.');
              setStatus('error');
              break;

            default:
              break;
          }
        }

        if (!abortRef.current && runId === runIdRef.current) {
          setStatus((prev) => (prev === 'running' ? 'done' : prev));
        }
      } catch (err) {
        if (!abortRef.current && runId === runIdRef.current) {
          setError(err instanceof Error ? err.message : String(err));
          setStatus('error');
        }
      }
    })();
  }, []);

  return {
    status,
    progress,
    validated,
    unscored,
    warnings,
    error,
    startStream,
    dismissError,
    reset,
  };
}

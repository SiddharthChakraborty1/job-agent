import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeResume } from '../api/client';
import { loadLastRun, saveLastRun, savePreferredCities } from '../storage/lastRun';
import type { PipelineResponse, ValidatedJobResult, UnscoredJobResult } from '../types';

export type StreamStatus = 'idle' | 'running' | 'done' | 'error';

export interface PipelineStreamState {
  status: StreamStatus;
  progress: string;
  validated: ValidatedJobResult[];
  unscored: UnscoredJobResult[];
  warnings: string[];
  error: string | null;
  fromSaved: boolean;
  savedAt: string | null;
  cities: string[];
  startStream: (file: File, cities?: string[]) => void;
  cancel: () => void;
  dismissError: () => void;
  reset: () => void;
}

export function usePipelineStream(userSub: string): PipelineStreamState {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [progress, setProgress] = useState('');
  const [validated, setValidated] = useState<ValidatedJobResult[]>([]);
  const [unscored, setUnscored] = useState<UnscoredJobResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fromSaved, setFromSaved] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    const saved = loadLastRun(userSub);
    if (!saved) {
      setStatus('idle');
      setValidated([]);
      setUnscored([]);
      setWarnings([]);
      setFromSaved(false);
      setSavedAt(null);
      setCities([]);
      return;
    }
    setValidated(saved.validated);
    setUnscored(saved.unscored);
    setWarnings(saved.warnings);
    setCities(saved.cities ?? []);
    setSavedAt(saved.savedAt);
    setFromSaved(true);
    setStatus('done');
    setError(null);
    setProgress('');
  }, [userSub]);

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
    setProgress('');
    setError(null);
    setFromSaved(false);
  }, []);

  const reset = useCallback(() => {
    runIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
    setProgress('');
    setValidated([]);
    setUnscored([]);
    setWarnings([]);
    setError(null);
    setFromSaved(false);
    setSavedAt(null);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
    setStatus('idle');
  }, []);

  const startStream = useCallback(
    (file: File, preferredCities: string[] = []) => {
      const runId = ++runIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const nextCities = preferredCities.map((city) => city.trim()).filter(Boolean);
      setCities(nextCities);
      savePreferredCities(userSub, nextCities);
      setStatus('running');
      setProgress('');
      setValidated([]);
      setUnscored([]);
      setWarnings([]);
      setError(null);
      setFromSaved(false);
      setSavedAt(null);

      void (async () => {
        try {
          const generator = analyzeResume(file, {
            cities: nextCities,
            signal: controller.signal,
          });
          for await (const event of generator) {
            if (runId !== runIdRef.current) break;

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
                  const nextValidated = data.validated ?? [];
                  const nextUnscored = data.unscored ?? [];
                  setValidated(nextValidated);
                  setUnscored(nextUnscored);
                  setWarnings((prev) => {
                    const fromDone = data.warnings ?? [];
                    const nextWarnings = fromDone.length > 0 ? fromDone : prev;
                    const finishedAt = new Date().toISOString();
                    setSavedAt(finishedAt);
                    saveLastRun(userSub, {
                      savedAt: finishedAt,
                      cities: nextCities,
                      validated: nextValidated,
                      unscored: nextUnscored,
                      warnings: nextWarnings,
                    });
                    return nextWarnings;
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

          if (runId === runIdRef.current) {
            setStatus((prev) => (prev === 'running' ? 'done' : prev));
          }
        } catch (err) {
          if (runId !== runIdRef.current) return;
          if (err instanceof DOMException && err.name === 'AbortError') {
            setStatus('idle');
            return;
          }
          setError(err instanceof Error ? err.message : String(err));
          setStatus('error');
        }
      })();
    },
    [userSub]
  );

  return {
    status,
    progress,
    validated,
    unscored,
    warnings,
    error,
    fromSaved,
    savedAt,
    cities,
    startStream,
    cancel,
    dismissError,
    reset,
  };
}

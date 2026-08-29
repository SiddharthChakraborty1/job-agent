import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeResume } from '../api/client';
import {
  fetchLatestRun,
  fetchPreferredCities,
  fetchStatuses,
  savePreferredCitiesRemote,
  updateStatusRemote,
} from '../api/persistence';
import {
  loadApplicationStatuses,
  saveApplicationStatuses,
  setApplicationStatus,
  type ApplicationStatus,
} from '../storage/applicationStatus';
import {
  loadLastRun,
  loadPreferredCities,
  saveLastRun,
  savePreferredCities,
  type SavedRun,
} from '../storage/lastRun';
import type { PipelineResponse, SkillGap, ValidatedJobResult, UnscoredJobResult } from '../types';

export type StreamStatus = 'idle' | 'running' | 'done' | 'error';

export interface PipelineStreamState {
  status: StreamStatus;
  progress: string;
  validated: ValidatedJobResult[];
  unscored: UnscoredJobResult[];
  warnings: string[];
  skillGaps: SkillGap[];
  newJobUrls: string[];
  newSinceLastCount: number | null;
  applicationStatuses: Record<string, ApplicationStatus>;
  error: string | null;
  fromSaved: boolean;
  savedAt: string | null;
  cities: string[];
  startStream: (file: File, cities?: string[]) => void;
  cancel: () => void;
  dismissError: () => void;
  reset: () => void;
  updateApplicationStatus: (jobUrl: string, status: ApplicationStatus) => void;
}

function applySavedRun(
  saved: SavedRun,
  setters: {
    setValidated: (v: ValidatedJobResult[]) => void;
    setUnscored: (v: UnscoredJobResult[]) => void;
    setWarnings: (v: string[]) => void;
    setSkillGaps: (v: SkillGap[]) => void;
    setNewJobUrls: (v: string[]) => void;
    setNewSinceLastCount: (v: number | null) => void;
    setCities: (v: string[]) => void;
    setSavedAt: (v: string | null) => void;
    setFromSaved: (v: boolean) => void;
    setStatus: (v: StreamStatus) => void;
    setError: (v: string | null) => void;
    setProgress: (v: string) => void;
  }
) {
  setters.setValidated(saved.validated);
  setters.setUnscored(saved.unscored);
  setters.setWarnings(saved.warnings);
  setters.setSkillGaps(saved.skillGaps ?? []);
  setters.setNewJobUrls(saved.newJobUrls ?? []);
  setters.setNewSinceLastCount(
    typeof saved.newSinceLastCount === 'number' ? saved.newSinceLastCount : null
  );
  setters.setCities(saved.cities ?? []);
  setters.setSavedAt(saved.savedAt);
  setters.setFromSaved(true);
  setters.setStatus('done');
  setters.setError(null);
  setters.setProgress('');
}

export function usePipelineStream(userSub: string): PipelineStreamState {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [progress, setProgress] = useState('');
  const [validated, setValidated] = useState<ValidatedJobResult[]>([]);
  const [unscored, setUnscored] = useState<UnscoredJobResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
  const [newJobUrls, setNewJobUrls] = useState<string[]>([]);
  const [newSinceLastCount, setNewSinceLastCount] = useState<number | null>(null);
  const [applicationStatuses, setApplicationStatuses] = useState<
    Record<string, ApplicationStatus>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [fromSaved, setFromSaved] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!userSub) return;
    const controller = new AbortController();

    // Instant local paint, then refresh from cloud when available.
    setApplicationStatuses(loadApplicationStatuses(userSub));
    const local = loadLastRun(userSub);
    if (local) {
      applySavedRun(local, {
        setValidated,
        setUnscored,
        setWarnings,
        setSkillGaps,
        setNewJobUrls,
        setNewSinceLastCount,
        setCities,
        setSavedAt,
        setFromSaved,
        setStatus,
        setError,
        setProgress,
      });
    } else {
      setStatus('idle');
      setValidated([]);
      setUnscored([]);
      setWarnings([]);
      setSkillGaps([]);
      setNewJobUrls([]);
      setNewSinceLastCount(null);
      setFromSaved(false);
      setSavedAt(null);
      setCities(loadPreferredCities(userSub));
    }

    void (async () => {
      try {
        const [remoteRun, remoteStatuses, remoteCities] = await Promise.all([
          fetchLatestRun(controller.signal),
          fetchStatuses(controller.signal),
          fetchPreferredCities(controller.signal),
        ]);
        if (controller.signal.aborted) return;

        if (Object.keys(remoteStatuses).length > 0) {
          setApplicationStatuses(remoteStatuses);
          saveApplicationStatuses(userSub, remoteStatuses);
        }

        if (remoteRun) {
          const saved: SavedRun = {
            savedAt: remoteRun.savedAt,
            cities: remoteRun.cities ?? [],
            validated: remoteRun.validated ?? [],
            unscored: remoteRun.unscored ?? [],
            warnings: remoteRun.warnings ?? [],
            skillGaps: remoteRun.skillGaps ?? [],
            newJobUrls: remoteRun.newJobUrls ?? [],
            newSinceLastCount: remoteRun.newSinceLastCount,
          };
          applySavedRun(saved, {
            setValidated,
            setUnscored,
            setWarnings,
            setSkillGaps,
            setNewJobUrls,
            setNewSinceLastCount,
            setCities,
            setSavedAt,
            setFromSaved,
            setStatus,
            setError,
            setProgress,
          });
          saveLastRun(userSub, saved);
        }

        if (remoteCities.length > 0) {
          setCities((prev) => (prev.length > 0 ? prev : remoteCities));
          savePreferredCities(userSub, remoteCities);
        }
      } catch {
        // Keep local snapshot if cloud is unreachable.
      }
    })();

    return () => controller.abort();
  }, [userSub]);

  const updateApplicationStatus = useCallback(
    (jobUrl: string, next: ApplicationStatus) => {
      const updated = setApplicationStatus(userSub, jobUrl, next);
      setApplicationStatuses({ ...updated });
      void updateStatusRemote(jobUrl, next)
        .then((remote) => {
          setApplicationStatuses(remote);
          saveApplicationStatuses(userSub, remote);
        })
        .catch(() => {
          // Local update already applied.
        });
    },
    [userSub]
  );

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
    setSkillGaps([]);
    setNewJobUrls([]);
    setNewSinceLastCount(null);
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
      void savePreferredCitiesRemote(nextCities).catch(() => undefined);
      setStatus('running');
      setProgress('');
      setValidated([]);
      setUnscored([]);
      setWarnings([]);
      setSkillGaps([]);
      setNewJobUrls([]);
      setNewSinceLastCount(null);
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
                  const nextGaps = data.skill_gaps ?? [];
                  const freshUrls = data.new_job_urls ?? [];
                  const freshCount =
                    typeof data.new_since_last_count === 'number'
                      ? data.new_since_last_count
                      : null;
                  const finishedAt = data.saved_at ?? new Date().toISOString();
                  setValidated(nextValidated);
                  setUnscored(nextUnscored);
                  setSkillGaps(nextGaps);
                  setNewJobUrls(freshUrls);
                  setNewSinceLastCount(freshCount);
                  setSavedAt(finishedAt);
                  setWarnings((prev) => {
                    const fromDone = data.warnings ?? [];
                    const nextWarnings = fromDone.length > 0 ? fromDone : prev;
                    saveLastRun(userSub, {
                      savedAt: finishedAt,
                      cities: nextCities,
                      validated: nextValidated,
                      unscored: nextUnscored,
                      warnings: nextWarnings,
                      skillGaps: nextGaps,
                      newJobUrls: freshUrls,
                      newSinceLastCount: freshCount,
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
    skillGaps,
    newJobUrls,
    newSinceLastCount,
    applicationStatuses,
    error,
    fromSaved,
    savedAt,
    cities,
    startStream,
    cancel,
    dismissError,
    reset,
    updateApplicationStatus,
  };
}

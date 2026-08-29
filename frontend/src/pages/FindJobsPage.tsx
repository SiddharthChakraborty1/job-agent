import { useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import { FileUpload } from '../components/FileUpload';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { ResultsTable } from '../components/ResultsTable';
import { ErrorBanner } from '../components/ErrorBanner';
import { AppShell } from '../components/AppShell';
import type { PipelineStreamState } from '../hooks/usePipelineStream';

interface FindJobsPageProps {
  userSub: string;
  pipeline: PipelineStreamState;
}

export function FindJobsPage({ userSub, pipeline }: FindJobsPageProps) {
  const {
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
  } = pipeline;

  const handleSubmit = useCallback(
    (file: File, preferredCities: string[]) => {
      startStream(file, preferredCities);
    },
    [startStream]
  );

  return (
    <AppShell fillMain={status === 'done'}>
      {status === 'error' && error && (
        <ErrorBanner message={error} onDismiss={dismissError} />
      )}

      {(status === 'idle' || status === 'error') && (
        <FileUpload onSubmit={handleSubmit} userSub={userSub} initialCities={cities} />
      )}

      {status === 'running' && <ProgressIndicator message={progress} onCancel={cancel} />}

      {status === 'done' && (
        <>
          <ResultsTable
            validated={validated}
            unscored={unscored}
            warnings={warnings}
            skillGaps={skillGaps}
            newJobUrls={newJobUrls}
            newSinceLastCount={newSinceLastCount}
            applicationStatuses={applicationStatuses}
            onStatusChange={updateApplicationStatus}
            fromSaved={fromSaved}
            savedAt={savedAt}
            city={cities.join(', ')}
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, flexShrink: 0 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={reset}
              size="large"
            >
              Search again
            </Button>
          </Box>
        </>
      )}
    </AppShell>
  );
}

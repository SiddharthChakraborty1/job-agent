import { useCallback } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
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

  const showUpload = status === 'idle' || status === 'error';

  return (
    <AppShell fillMain={status === 'done'}>
      {status === 'error' && error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {showUpload && (
        <Box sx={{ width: '100%', maxWidth: 560, mx: 'auto' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Chip
              icon={<AutoAwesomeIcon sx={{ fontSize: 15 }} />}
              label="AI resume matching"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mb: 1.5 }}
            />
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontSize: { xs: '1.6rem', sm: '2.1rem' }, mb: 1 }}
            >
              Find roles that fit your resume
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 420, mx: 'auto', fontSize: '0.95rem' }}
            >
              Upload your resume once. We search startups, mid-size companies, and enterprises,
              then score every role against your experience.
            </Typography>
          </Box>

          <FileUpload onSubmit={handleSubmit} userSub={userSub} initialCities={cities} />
        </Box>
      )}

      {status === 'running' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', pt: { sm: 2 } }}>
          <ProgressIndicator message={progress} onCancel={cancel} />
        </Box>
      )}

      {status === 'done' && (
        <ResultsTable
          validated={validated}
          unscored={unscored}
          warnings={warnings}
          skillGaps={skillGaps}
          newJobUrls={newJobUrls}
          newSinceLastCount={newSinceLastCount}
          applicationStatuses={applicationStatuses}
          onStatusChange={updateApplicationStatus}
          onNewSearch={reset}
          fromSaved={fromSaved}
          savedAt={savedAt}
          city={cities.join(', ')}
        />
      )}
    </AppShell>
  );
}

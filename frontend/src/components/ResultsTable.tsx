import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import FiberNewOutlinedIcon from '@mui/icons-material/FiberNewOutlined';
import { JobCard } from './JobCard';
import { SkillGapSummary } from './SkillGapSummary';
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from '../storage/applicationStatus';
import type { SkillGap, ValidatedJobResult, UnscoredJobResult } from '../types';

interface ResultsTableProps {
  validated: ValidatedJobResult[];
  unscored: UnscoredJobResult[];
  warnings?: string[];
  skillGaps?: SkillGap[];
  newJobUrls?: string[];
  newSinceLastCount?: number | null;
  applicationStatuses: Record<string, ApplicationStatus>;
  onStatusChange: (jobUrl: string, status: ApplicationStatus) => void;
  fromSaved?: boolean;
  savedAt?: string | null;
  city?: string;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(
  validated: ValidatedJobResult[],
  unscored: UnscoredJobResult[],
  statuses: Record<string, ApplicationStatus>
): string {
  const header = [
    'posted_date',
    'job_title',
    'company_name',
    'organisation_tier',
    'alignment_score',
    'justification',
    'description',
    'job_url',
    'application_status',
    'missing_skills',
  ];
  const rows = [
    ...validated.map((job) => [
      job.posted_date ?? '',
      job.job_title,
      job.company_name,
      job.organisation_tier,
      String(job.alignment_score),
      job.justification,
      job.description,
      job.job_url,
      APPLICATION_STATUS_LABELS[statuses[job.job_url] ?? 'not_applied'],
      (job.missing_skills ?? []).join('; '),
    ]),
    ...unscored.map((job) => [
      job.posted_date ?? '',
      job.job_title,
      job.company_name,
      job.organisation_tier,
      '',
      '',
      job.description,
      job.job_url,
      APPLICATION_STATUS_LABELS[statuses[job.job_url] ?? 'not_applied'],
      '',
    ]),
  ];
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function allUrls(validated: ValidatedJobResult[], unscored: UnscoredJobResult[]): string[] {
  return [...validated, ...unscored].map((job) => job.job_url);
}

function postedTimestamp(dateStr: string | null): number {
  if (!dateStr) return 0;
  const value = Date.parse(dateStr);
  return Number.isNaN(value) ? 0 : value;
}

function sortValidated(jobs: ValidatedJobResult[]): ValidatedJobResult[] {
  return [...jobs].sort((a, b) => {
    const dateA = postedTimestamp(a.posted_date);
    const dateB = postedTimestamp(b.posted_date);
    if (dateA !== dateB) return dateB - dateA;
    return b.alignment_score - a.alignment_score;
  });
}

function sortUnscored(jobs: UnscoredJobResult[]): UnscoredJobResult[] {
  return [...jobs].sort((a, b) => postedTimestamp(b.posted_date) - postedTimestamp(a.posted_date));
}

function formatSavedAt(savedAt: string | null | undefined): string {
  if (!savedAt) return '';
  const d = new Date(savedAt);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

const scrollSx = {
  flex: '1 1 0%',
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  overscrollBehavior: 'contain',
  WebkitOverflowScrolling: 'touch',
  pr: 0.75,
  scrollPaddingBottom: 16,
  scrollbarWidth: 'thin',
  scrollbarColor: (theme: { palette: { mode: string } }) =>
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.35) transparent'
      : 'rgba(15,23,42,0.3) transparent',
  '&::-webkit-scrollbar': { width: 8 },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    borderRadius: 999,
    backgroundColor: (theme: { palette: { mode: string } }) =>
      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.32)' : 'rgba(15,23,42,0.3)',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: (theme: { palette: { mode: string } }) =>
      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.48)' : 'rgba(15,23,42,0.45)',
  },
} as const;

export function ResultsTable({
  validated,
  unscored,
  warnings = [],
  skillGaps = [],
  newJobUrls = [],
  newSinceLastCount = null,
  applicationStatuses,
  onStatusChange,
  fromSaved = false,
  savedAt,
  city,
}: ResultsTableProps) {
  const sortedValidated = useMemo(() => sortValidated(validated), [validated]);
  const sortedUnscored = useMemo(() => sortUnscored(unscored), [unscored]);
  const isEmpty = sortedValidated.length === 0 && sortedUnscored.length === 0;
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const urls = useMemo(
    () => allUrls(sortedValidated, sortedUnscored),
    [sortedValidated, sortedUnscored]
  );
  const newUrlSet = useMemo(() => new Set(newJobUrls), [newJobUrls]);
  const savedLabel = formatSavedAt(savedAt);
  const showDelta =
    typeof newSinceLastCount === 'number' && newSinceLastCount > 0 && !fromSaved;

  const handleExport = () => {
    const blob = new Blob([toCsv(sortedValidated, sortedUnscored, applicationStatuses)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `job-matches-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(urls.join('\n'));
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), 2000);
    }
  };

  const statusFor = (jobUrl: string): ApplicationStatus =>
    applicationStatuses[jobUrl] ?? 'not_applied';

  return (
    <Box
      sx={{
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {fromSaved && savedLabel && (
        <Alert
          severity="info"
          sx={{
            mb: 1,
            flexShrink: 0,
            py: 0.25,
            '& .MuiAlert-message': { fontSize: '0.8rem' },
          }}
        >
          Last search · {savedLabel}
          {city ? ` · ${city}` : ''}
          {typeof newSinceLastCount === 'number' && newSinceLastCount > 0
            ? ` · ${newSinceLastCount} new`
            : ''}
        </Alert>
      )}

      {showDelta && (
        <Alert
          severity="success"
          icon={<FiberNewOutlinedIcon fontSize="inherit" />}
          sx={{ mb: 1, flexShrink: 0, py: 0.25, '& .MuiAlert-message': { fontSize: '0.8rem' } }}
        >
          {newSinceLastCount} new posting{newSinceLastCount === 1 ? '' : 's'} since your last search
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert
          severity="warning"
          role="status"
          sx={{ mb: 1, flexShrink: 0, py: 0.25, '& .MuiAlert-message': { fontSize: '0.8rem' } }}
        >
          {warnings.map((w, i) => (
            <Typography key={i} variant="body2" sx={{ mt: i === 0 ? 0 : 0.5, fontSize: 'inherit' }}>
              {w}
            </Typography>
          ))}
        </Alert>
      )}

      {!isEmpty && <SkillGapSummary gaps={skillGaps} />}

      {!isEmpty && (
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexShrink: 0 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadOutlinedIcon />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={() => void handleCopy()}
            disabled={urls.length === 0}
          >
            {copyState === 'copied'
              ? 'Copied'
              : copyState === 'failed'
                ? 'Copy failed'
                : 'Copy links'}
          </Button>
        </Stack>
      )}

      {isEmpty ? (
        <Paper
          role="status"
          elevation={0}
          sx={{
            textAlign: 'center',
            py: 6,
            px: 2,
            bgcolor: 'background.default',
            borderRadius: 3,
          }}
        >
          <SearchOffOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No matching jobs found
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Try a different city or resume, then search again.
          </Typography>
        </Paper>
      ) : (
        <Box sx={scrollSx}>
          {sortedValidated.length > 0 && (
            <Box component="section" aria-labelledby="validated-heading" sx={{ mb: 3 }}>
              <Typography
                id="validated-heading"
                variant="h5"
                component="h2"
                sx={{ mb: 1.25, fontWeight: 600, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
              >
                Matched Jobs
                <Chip label={sortedValidated.length} size="small" color="primary" sx={{ ml: 1.5 }} />
              </Typography>
              {sortedValidated.map((job) => (
                <JobCard
                  key={job.job_url}
                  job={job}
                  scored
                  isNew={newUrlSet.has(job.job_url)}
                  applicationStatus={statusFor(job.job_url)}
                  onStatusChange={onStatusChange}
                />
              ))}
            </Box>
          )}

          {sortedUnscored.length > 0 && (
            <Box component="section" aria-labelledby="unscored-heading">
              <Typography
                id="unscored-heading"
                variant="h5"
                component="h2"
                sx={{ mb: 0.5, fontWeight: 600, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
              >
                Unscored Jobs
                <Chip label={sortedUnscored.length} size="small" sx={{ ml: 1.5 }} />
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                These listings could not be scored against your resume.
              </Typography>
              {sortedUnscored.map((job) => (
                <JobCard
                  key={job.job_url}
                  job={job}
                  scored={false}
                  isNew={newUrlSet.has(job.job_url)}
                  applicationStatus={statusFor(job.job_url)}
                  onStatusChange={onStatusChange}
                />
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

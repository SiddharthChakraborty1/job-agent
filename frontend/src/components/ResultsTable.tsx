import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
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
  onNewSearch?: () => void;
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

export function ResultsTable({
  validated,
  unscored,
  warnings = [],
  skillGaps = [],
  newJobUrls = [],
  newSinceLastCount = null,
  applicationStatuses,
  onStatusChange,
  onNewSearch,
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
  const total = sortedValidated.length + sortedUnscored.length;

  const metaParts: string[] = [];
  if (city) metaParts.push(city);
  if (fromSaved) {
    const label = formatSavedAt(savedAt);
    if (label) metaParts.push(`saved ${label}`);
  }
  if (typeof newSinceLastCount === 'number' && newSinceLastCount > 0) {
    metaParts.push(`${newSinceLastCount} new since last run`);
  }

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
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          flexShrink: 0,
          mb: 1.25,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" component="h2" sx={{ fontSize: '1.05rem' }}>
              {isEmpty ? 'No matches' : `${total} matching role${total === 1 ? '' : 's'}`}
            </Typography>
            {sortedUnscored.length > 0 && (
              <Chip label={`${sortedUnscored.length} unscored`} size="small" variant="outlined" />
            )}
          </Box>
          {metaParts.length > 0 && (
            <Typography variant="caption" color="text.secondary" noWrap component="div">
              {metaParts.join(' · ')}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          {!isEmpty && (
            <>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<DownloadOutlinedIcon sx={{ fontSize: 17 }} />}
                onClick={handleExport}
                sx={{ color: 'text.secondary' }}
              >
                CSV
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
                onClick={() => void handleCopy()}
                disabled={urls.length === 0}
                sx={{ color: 'text.secondary' }}
              >
                {copyState === 'copied'
                  ? 'Copied'
                  : copyState === 'failed'
                    ? 'Failed'
                    : 'Copy links'}
              </Button>
            </>
          )}
          {onNewSearch && (
            <Button
              variant="contained"
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 17 }} />}
              onClick={onNewSearch}
            >
              New search
            </Button>
          )}
        </Stack>
      </Box>

      {warnings.length > 0 && (
        <Alert
          severity="warning"
          role="status"
          sx={{ mb: 1.25, flexShrink: 0, py: 0.25, '& .MuiAlert-message': { fontSize: '0.8rem' } }}
        >
          {warnings.map((w, i) => (
            <Typography key={i} variant="body2" sx={{ mt: i === 0 ? 0 : 0.5, fontSize: 'inherit' }}>
              {w}
            </Typography>
          ))}
        </Alert>
      )}

      {!isEmpty && <SkillGapSummary gaps={skillGaps} />}

      {isEmpty ? (
        <Box
          role="status"
          sx={{
            textAlign: 'center',
            py: 8,
            px: 2,
            borderRadius: 4,
            border: (theme) => `1px dashed ${theme.palette.divider}`,
          }}
        >
          <SearchOffOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No matching jobs found
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Try a different city or resume, then search again.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            pr: 0.5,
            pb: 1,
          }}
        >
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

          {sortedUnscored.length > 0 && (
            <Box component="section" aria-labelledby="unscored-heading" sx={{ mt: 2 }}>
              <Divider sx={{ mb: 1.75 }}>
                <Typography
                  id="unscored-heading"
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  Could not be scored
                </Typography>
              </Divider>
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

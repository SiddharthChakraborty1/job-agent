import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { fetchAdminUserRun } from '../api/admin';
import type { SavedRunDto } from '../api/persistence';
import { formatSavedAt } from '../formatDate';
import { ScoreDonut } from '../components/ScoreDonut';

export function AdminRunDetailPage() {
  const { sub = '', runId = '' } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState<SavedRunDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAdminUserRun(sub, runId, signal);
        if (!signal?.aborted) setRun(data);
      } catch (err) {
        if (!signal?.aborted) {
          setError(err instanceof Error ? err.message : String(err));
          setRun(null);
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [sub, runId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <>
      <Box sx={{ flexShrink: 0, mb: 1.5 }}>
        <Button
          size="small"
          color="inherit"
          startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
          onClick={() => navigate(`/admin/users/${encodeURIComponent(sub)}`)}
          sx={{ color: 'text.secondary', mb: 1 }}
        >
          Back to user
        </Button>
        <Typography variant="h6" component="h1" sx={{ fontSize: '1.05rem' }}>
          {run ? formatSavedAt(run.savedAt) : 'Search'}
        </Typography>
        {run && (
          <Typography variant="caption" color="text.secondary">
            {run.cities.length > 0 ? run.cities.join(', ') : 'No city filter'}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5, pb: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : !run ? null : (
          <>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
              <Chip
                size="small"
                variant="outlined"
                label={`${run.validated.length} scored`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${run.unscored.length} unscored`}
              />
              {typeof run.newSinceLastCount === 'number' && run.newSinceLastCount > 0 && (
                <Chip size="small" color="primary" label={`${run.newSinceLastCount} new`} />
              )}
            </Box>

            {run.warnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {run.warnings.join(' · ')}
              </Alert>
            )}

            {run.skillGaps.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Skill gaps
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {run.skillGaps.map((gap) => (
                    <Chip
                      key={gap.skill}
                      size="small"
                      variant="outlined"
                      label={`${gap.skill} (${gap.count})`}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {run.validated.map((job) => (
              <Card key={job.job_url} sx={{ mb: 1.25, p: 1.75 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <ScoreDonut score={job.alignment_score} size={44} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2">{job.job_title}</Typography>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {job.company_name}
                      {job.organisation_tier ? ` · ${job.organisation_tier}` : ''}
                    </Typography>
                    {job.job_url && (
                      <Link
                        href={job.job_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="caption"
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, mt: 0.5 }}
                      >
                        Open listing
                        <OpenInNewIcon sx={{ fontSize: 12 }} />
                      </Link>
                    )}
                  </Box>
                </Box>
              </Card>
            ))}

            {run.unscored.map((job) => (
              <Card key={job.job_url} sx={{ mb: 1.25, p: 1.75 }}>
                <Typography variant="subtitle2">{job.job_title}</Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  {job.company_name} · unscored
                </Typography>
                {job.job_url && (
                  <Link
                    href={job.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="caption"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, mt: 0.5 }}
                  >
                    Open listing
                    <OpenInNewIcon sx={{ fontSize: 12 }} />
                  </Link>
                )}
              </Card>
            ))}
          </>
        )}
      </Box>
    </>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AppShell } from '../components/AppShell';
import { fetchRunSummaries, type SavedRunSummaryDto } from '../api/persistence';

interface HistoryPageProps {
  loadRunById: (runId: string) => Promise<boolean>;
}

function formatSavedAt(savedAt: string): string {
  const d = new Date(savedAt);
  if (Number.isNaN(d.getTime())) return savedAt;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function HistoryPage({ loadRunById }: HistoryPageProps) {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<SavedRunSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchRunSummaries(30, signal);
      if (!signal?.aborted) setRuns(rows);
    } catch (err) {
      if (!signal?.aborted) {
        setError(err instanceof Error ? err.message : String(err));
        setRuns([]);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleOpen = async (runId: string) => {
    setOpeningId(runId);
    setError(null);
    const ok = await loadRunById(runId);
    setOpeningId(null);
    if (ok) {
      navigate('/');
      return;
    }
    setError('Could not open that search. It may have been deleted.');
  };

  return (
    <AppShell fillMain>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          flexShrink: 0,
          mb: 1.5,
        }}
      >
        <Box>
          <Typography variant="h6" component="h1" sx={{ fontSize: '1.05rem' }}>
            Past searches
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Open a run to review matches and update application status.
          </Typography>
        </Box>
        {runs.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<RefreshIcon sx={{ fontSize: 17 }} />}
            onClick={() => void load()}
            disabled={loading}
            sx={{ color: 'text.secondary', flexShrink: 0 }}
          >
            Refresh
          </Button>
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
        ) : runs.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              px: 2,
              borderRadius: 4,
              border: (theme) => `1px dashed ${theme.palette.divider}`,
            }}
          >
            <HistoryOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No saved searches yet
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mb: 2.5 }}>
              Completed runs show up here so you can revisit them later.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/')}>
              Start a search
            </Button>
          </Box>
        ) : (
          runs.map((run) => {
            const total = run.validatedCount + run.unscoredCount;
            const cities = run.cities.length > 0 ? run.cities.join(', ') : 'No city filter';
            const isOpening = openingId === run.id;
            return (
              <Card
                key={run.id}
                role="button"
                tabIndex={0}
                onClick={() => void handleOpen(run.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') void handleOpen(run.id);
                }}
                sx={{
                  mb: 1.25,
                  p: 1.75,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.75,
                  cursor: 'pointer',
                  opacity: isOpening ? 0.6 : 1,
                  transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'dark'
                        ? '0 6px 24px rgba(0,0,0,0.45)'
                        : '0 6px 24px rgba(15,23,42,0.08)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2.5,
                    flexShrink: 0,
                    display: { xs: 'none', sm: 'inline-flex' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  }}
                >
                  <HistoryOutlinedIcon sx={{ fontSize: 20 }} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>
                    {formatSavedAt(run.savedAt)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                    <PlaceOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {cities}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    flexShrink: 0,
                  }}
                >
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${total} job${total === 1 ? '' : 's'}`}
                  />
                  {typeof run.newSinceLastCount === 'number' && run.newSinceLastCount > 0 && (
                    <Chip size="small" color="primary" label={`${run.newSinceLastCount} new`} />
                  )}
                  {isOpening ? (
                    <CircularProgress size={18} />
                  ) : (
                    <ChevronRightIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                  )}
                </Box>
              </Card>
            );
          })
        )}
      </Box>
    </AppShell>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AppShell } from '../components/AppShell';
import {
  fetchRunSummaries,
  type SavedRunSummaryDto,
} from '../api/persistence';

interface HistoryPageProps {
  loadRunById: (runId: string) => Promise<boolean>;
}

function formatSavedAt(savedAt: string): string {
  const d = new Date(savedAt);
  return Number.isNaN(d.getTime()) ? savedAt : d.toLocaleString();
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
    <AppShell>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Past searches
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Open a previous run to review matches and update application status. Find jobs stays
          your default home.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : runs.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            textAlign: 'center',
            py: 6,
            px: 2,
            bgcolor: 'background.default',
            borderRadius: 3,
          }}
        >
          <HistoryOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No saved searches yet
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            Run a search from Find jobs — completed runs appear here when cloud storage is
            configured.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            Go to Find jobs
          </Button>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <List disablePadding>
              {runs.map((run, index) => {
                const total = run.validatedCount + run.unscoredCount;
                const cities =
                  run.cities.length > 0 ? run.cities.join(', ') : 'No city filter';
                return (
                  <ListItemButton
                    key={run.id}
                    divider={index < runs.length - 1}
                    disabled={openingId === run.id}
                    onClick={() => void handleOpen(run.id)}
                  >
                    <ListItemText
                      primary={formatSavedAt(run.savedAt)}
                      secondary={cities}
                      sx={{ '& .MuiListItemText-primary': { fontWeight: 600 } }}
                    />
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Chip size="small" label={`${total} job${total === 1 ? '' : 's'}`} />
                      {typeof run.newSinceLastCount === 'number' && run.newSinceLastCount > 0 && (
                        <Chip
                          size="small"
                          color="primary"
                          label={`${run.newSinceLastCount} new`}
                        />
                      )}
                      {openingId === run.id && <CircularProgress size={18} />}
                    </Box>
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        </>
      )}
    </AppShell>
  );
}

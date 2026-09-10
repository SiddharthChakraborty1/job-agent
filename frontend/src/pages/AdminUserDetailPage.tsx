import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { fetchAdminUser, type AdminUserDetail } from '../api/admin';
import { formatSavedAt } from '../formatDate';

export function AdminUserDetailPage() {
  const { sub = '' } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchAdminUser(sub, signal);
        if (!signal?.aborted) setUser(detail);
      } catch (err) {
        if (!signal?.aborted) {
          setError(err instanceof Error ? err.message : String(err));
          setUser(null);
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [sub]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const displayName = user?.name || user?.email || user?.sub || 'User';

  return (
    <>
      <Box sx={{ flexShrink: 0, mb: 1.5 }}>
        <Button
          size="small"
          color="inherit"
          startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
          onClick={() => navigate('/admin')}
          sx={{ color: 'text.secondary', mb: 1 }}
        >
          All users
        </Button>
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={user.picture ?? undefined}
              alt={displayName}
              sx={{
                width: 48,
                height: 48,
                fontWeight: 600,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                color: 'primary.main',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" component="h1" sx={{ fontSize: '1.05rem' }} noWrap>
                {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div" noWrap>
                {user.email || 'Email not stored yet'}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {user && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5, flexShrink: 0 }}>
          <Chip
            size="small"
            variant="outlined"
            label={`${user.searchCount} search${user.searchCount === 1 ? '' : 'es'}`}
          />
          {user.lastLoginAt && (
            <Chip size="small" variant="outlined" label={`Last login ${formatSavedAt(user.lastLoginAt)}`} />
          )}
          {user.preferredCities.map((city) => (
            <Chip key={city} size="small" color="primary" variant="outlined" label={city} />
          ))}
        </Box>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1, flexShrink: 0 }}>
        Searches
      </Typography>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5, pb: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : !user || user.runs.length === 0 ? (
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
              No searches yet
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Completed job searches for this account will show up here.
            </Typography>
          </Box>
        ) : (
          user.runs.map((run) => {
            const total = run.validatedCount + run.unscoredCount;
            const cities = run.cities.length > 0 ? run.cities.join(', ') : 'No city filter';
            return (
              <Card
                key={run.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  navigate(
                    `/admin/users/${encodeURIComponent(sub)}/runs/${encodeURIComponent(run.id)}`
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    navigate(
                      `/admin/users/${encodeURIComponent(sub)}/runs/${encodeURIComponent(run.id)}`
                    );
                  }
                }}
                sx={{
                  mb: 1.25,
                  p: 1.75,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.75,
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main' },
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
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${total} job${total === 1 ? '' : 's'}`}
                />
                {typeof run.newSinceLastCount === 'number' && run.newSinceLastCount > 0 && (
                  <Chip size="small" color="primary" label={`${run.newSinceLastCount} new`} />
                )}
                <ChevronRightIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
              </Card>
            );
          })
        )}
      </Box>
    </>
  );
}

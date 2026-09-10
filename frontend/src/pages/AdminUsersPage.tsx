import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { fetchAdminUsers, type AdminUserSummary } from '../api/admin';
import { formatSavedAt } from '../formatDate';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAdminUsers(signal);
      if (!signal?.aborted) setUsers(rows);
    } catch (err) {
      if (!signal?.aborted) {
        setError(err instanceof Error ? err.message : String(err));
        setUsers([]);
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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => {
      const hay = `${user.name} ${user.email} ${user.sub}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [users, query]);

  const totalSearches = users.reduce((sum, user) => sum + user.searchCount, 0);

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          flexDirection: { xs: 'column', sm: 'row' },
          flexShrink: 0,
          mb: 1.5,
        }}
      >
        <Box>
          <Typography variant="h6" component="h1" sx={{ fontSize: '1.05rem' }}>
            Users
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {users.length} account{users.length === 1 ? '' : 's'} · {totalSearches} search
            {totalSearches === 1 ? '' : 'es'}
          </Typography>
        </Box>
        <TextField
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or email"
          sx={{ width: { xs: '100%', sm: 260 }, flexShrink: 0 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />
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
        ) : filtered.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              px: 2,
              borderRadius: 4,
              border: (theme) => `1px dashed ${theme.palette.divider}`,
            }}
          >
            <PeopleOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {users.length === 0 ? 'No users yet' : 'No matching users'}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {users.length === 0
                ? 'Accounts appear here after someone signs in.'
                : 'Try a different name or email.'}
            </Typography>
          </Box>
        ) : (
          filtered.map((user) => {
            const displayName = user.name || user.email || user.sub;
            return (
              <Card
                key={user.sub}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/users/${encodeURIComponent(user.sub)}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    navigate(`/admin/users/${encodeURIComponent(user.sub)}`);
                  }
                }}
                sx={{
                  mb: 1.25,
                  p: 1.75,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.75,
                  cursor: 'pointer',
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
                <Avatar
                  src={user.picture ?? undefined}
                  alt={displayName}
                  sx={{
                    width: 40,
                    height: 40,
                    fontWeight: 600,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                    color: 'primary.main',
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>
                    {displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {user.email || 'Email not stored yet'}
                  </Typography>
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
                    label={`${user.searchCount} search${user.searchCount === 1 ? '' : 'es'}`}
                  />
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 108, textAlign: 'right' }}
                  >
                    {user.lastSearchAt ? formatSavedAt(user.lastSearchAt) : 'No searches'}
                  </Typography>
                  <ChevronRightIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                </Box>
              </Card>
            );
          })
        )}
      </Box>
    </>
  );
}

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Link as RouterLink } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { DarkModeToggle } from './DarkModeToggle';
import { ErrorBanner } from './ErrorBanner';
import { useAuth } from '../context/AuthContext';

const HIGHLIGHTS = [
  { icon: BoltOutlinedIcon, text: 'One resume upload, jobs from every company tier' },
  { icon: TrackChangesOutlinedIcon, text: 'Every role scored against your experience' },
  { icon: InsightsOutlinedIcon, text: 'Skill gaps and application tracking built in' },
];

export function LoginPage() {
  const { login, error, clearError } = useAuth();

  const handleSuccess = (response: CredentialResponse) => {
    if (!response.credential) return;
    void login(response.credential);
  };

  return (
    <Box
      sx={{
        height: '100dvh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        position: 'relative',
        bgcolor: 'background.default',
        backgroundImage: (theme) =>
          `radial-gradient(60% 45% at 50% 0%, ${alpha(theme.palette.primary.main, 0.18)} 0%, transparent 70%)`,
      }}
    >
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <DarkModeToggle />
      </Box>

      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <BrandMark size={38} />
        </Box>

        <Typography
          variant="h4"
          component="h1"
          sx={{ textAlign: 'center', fontSize: { xs: '1.6rem', sm: '2rem' }, mb: 1 }}
        >
          Job hunting, minus the scrolling
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ textAlign: 'center', mb: 3, fontSize: '0.95rem' }}
        >
          Sign in to upload your resume and get roles ranked by how well they match.
        </Typography>

        {error && <ErrorBanner message={error} onDismiss={clearError} />}

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 4,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 24px 56px rgba(0,0,0,0.5)'
                : '0 24px 56px rgba(15,23,42,0.08)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => clearError()}
              useOneTap
              theme="outline"
              size="large"
              text="signin_with"
              shape="pill"
            />
          </Box>

          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}
          >
            We only use your name and email to identify your session.
          </Typography>

          <Box
            sx={{
              mt: 3,
              pt: 2.5,
              borderTop: (theme) => `1px solid ${theme.palette.divider}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 2,
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  }}
                >
                  <Icon sx={{ fontSize: 16 }} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button
            component={RouterLink}
            to="/admin"
            size="small"
            color="inherit"
            sx={{ color: 'text.disabled', fontWeight: 500 }}
          >
            Admin
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export function AuthLoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

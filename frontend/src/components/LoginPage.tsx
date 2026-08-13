import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { DarkModeToggle } from './DarkModeToggle';
import { ErrorBanner } from './ErrorBanner';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, error, clearError } = useAuth();

  const handleSuccess = (response: CredentialResponse) => {
    if (!response.credential) return;
    void login(response.credential);
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: (theme) =>
          `linear-gradient(180deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 40%)`,
      }}
    >
      <Box
        component="header"
        sx={{
          pt: { xs: 4, md: 6 },
          pb: { xs: 3, md: 4 },
          px: 2,
          textAlign: 'center',
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <DarkModeToggle />
        <Container maxWidth="sm" sx={{ position: 'relative' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              mb: 2,
            }}
          >
            <WorkOutlineOutlinedIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Resume Job Finder
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.92 }}>
            Sign in to upload your resume and find matching roles.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ flex: 1, py: 6 }}>
        {error && (
          <Box sx={{ mb: 3 }}>
            <ErrorBanner message={error} onDismiss={clearError} />
          </Box>
        )}

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            Sign in to continue
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Use your Google account. We only use your name and email to identify your session.
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => clearError()}
              useOneTap
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
            />
          </Box>
        </Paper>
      </Container>
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

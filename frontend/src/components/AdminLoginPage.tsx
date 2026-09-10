import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Link as RouterLink } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { DarkModeToggle } from './DarkModeToggle';
import { ErrorBanner } from './ErrorBanner';
import { useAuth } from '../context/AuthContext';

export function AdminLoginPage() {
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
          sx={{ textAlign: 'center', fontSize: { xs: '1.6rem', sm: '2rem' }, mb: 3 }}
        >
          Admin
        </Typography>

        {error && <ErrorBanner message={error} onDismiss={clearError} />}

        <Paper
          elevation={0}
          sx={{
            px: { xs: 2.5, sm: 3 },
            py: { xs: 3, sm: 3.5 },
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
              theme="outline"
              size="large"
              text="signin_with"
              shape="pill"
            />
          </Box>
        </Paper>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button
            component={RouterLink}
            to="/"
            size="small"
            color="inherit"
            sx={{ color: 'text.secondary' }}
          >
            Back to sign-in
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

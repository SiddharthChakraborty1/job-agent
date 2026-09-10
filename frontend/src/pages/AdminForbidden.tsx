import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { DarkModeToggle } from '../components/DarkModeToggle';
import { useAuth } from '../context/AuthContext';

export function AdminForbidden() {
  const { logout } = useAuth();

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

        <Paper
          elevation={0}
          sx={{
            px: { xs: 2.5, sm: 3.5 },
            py: { xs: 3, sm: 4 },
            borderRadius: 4,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            textAlign: 'center',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 24px 56px rgba(0,0,0,0.5)'
                : '0 24px 56px rgba(15,23,42,0.08)',
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' }, mb: 1 }}
          >
            You don’t have access
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This account isn’t authorized for admin.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
            <Button component={RouterLink} to="/" variant="contained">
              Go to app
            </Button>
            <Button color="inherit" onClick={() => void logout()}>
              Sign out
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

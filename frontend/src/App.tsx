import { useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { FileUpload } from './components/FileUpload';
import { ProgressIndicator } from './components/ProgressIndicator';
import { ResultsTable } from './components/ResultsTable';
import { ErrorBanner } from './components/ErrorBanner';
import { DarkModeToggle } from './components/DarkModeToggle';
import { LoginPage, AuthLoadingScreen } from './components/LoginPage';
import { UserMenu } from './components/UserMenu';
import { useAuth } from './context/AuthContext';
import { usePipelineStream } from './hooks/usePipelineStream';

function App() {
  const { user, loading } = useAuth();
  const {
    status,
    progress,
    validated,
    unscored,
    warnings,
    skillGaps,
    newJobUrls,
    newSinceLastCount,
    applicationStatuses,
    error,
    fromSaved,
    savedAt,
    cities,
    startStream,
    cancel,
    dismissError,
    reset,
    updateApplicationStatus,
  } = usePipelineStream(user?.sub ?? '');

  const handleSubmit = useCallback(
    (file: File, preferredCities: string[]) => {
      startStream(file, preferredCities);
    },
    [startStream]
  );

  if (loading) return <AuthLoadingScreen />;
  if (!user) return <LoginPage />;

  return (
    <Box
      sx={{
        height: '100dvh',
        maxHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: (theme) =>
          `linear-gradient(180deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 40%)`,
      }}
    >
      <Box
        component="header"
        sx={{
          flexShrink: 0,
          pt: { xs: 4, md: 6 },
          pb: { xs: 3, md: 4 },
          px: 2,
          textAlign: 'center',
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 40%)',
            pointerEvents: 'none',
          },
        }}
      >
        <DarkModeToggle />
        <UserMenu />
        <Container maxWidth="md" sx={{ position: 'relative' }}>
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
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
              mb: 1.5,
            }}
          >
            Resume Job Finder
          </Typography>
          <Typography
            variant="body1"
            sx={{
              maxWidth: 520,
              mx: 'auto',
              opacity: 0.92,
              lineHeight: 1.6,
              fontSize: { xs: '0.95rem', sm: '1.05rem' },
            }}
          >
            Upload your resume to find matching roles across startups, mid-level companies, and
            enterprises.
          </Typography>
        </Container>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          py: { xs: 3, md: 4 },
          overflow: status === 'done' ? 'hidden' : 'auto',
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            ...(status === 'done' && {
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }),
          }}
        >
          {status === 'error' && error && (
            <ErrorBanner message={error} onDismiss={dismissError} />
          )}

          {(status === 'idle' || status === 'error') && (
            <FileUpload onSubmit={handleSubmit} userSub={user.sub} initialCities={cities} />
          )}

          {status === 'running' && (
            <ProgressIndicator message={progress} onCancel={cancel} />
          )}

          {status === 'done' && (
            <>
              <ResultsTable
                validated={validated}
                unscored={unscored}
                warnings={warnings}
                skillGaps={skillGaps}
                newJobUrls={newJobUrls}
                newSinceLastCount={newSinceLastCount}
                applicationStatuses={applicationStatuses}
                onStatusChange={updateApplicationStatus}
                fromSaved={fromSaved}
                savedAt={savedAt}
                city={cities.join(', ')}
              />
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, flexShrink: 0 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={reset}
                  size="large"
                >
                  Search again
                </Button>
              </Box>
            </>
          )}
        </Container>
      </Box>
    </Box>
  );
}

export default App;

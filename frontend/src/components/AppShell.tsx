import { NavLink, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import { DarkModeToggle } from './DarkModeToggle';
import { UserMenu } from './UserMenu';

interface AppShellProps {
  children: React.ReactNode;
  fillMain?: boolean;
}

export function AppShell({ children, fillMain = false }: AppShellProps) {
  const location = useLocation();
  const tabValue = location.pathname.startsWith('/history') ? '/history' : '/';

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
          pt: { xs: fillMain ? 1.5 : 2.5, sm: 3, md: 4 },
          pb: { xs: fillMain ? 1 : 1.5, sm: 2, md: 2.5 },
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
              display: { xs: fillMain ? 'none' : 'inline-flex', sm: 'inline-flex' },
              alignItems: 'center',
              justifyContent: 'center',
              width: { xs: 44, sm: 56 },
              height: { xs: 44, sm: 56 },
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              mb: { xs: 1, sm: 1.5 },
            }}
          >
            <WorkOutlineOutlinedIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
          </Box>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: {
                xs: fillMain ? '1.15rem' : '1.35rem',
                sm: '2rem',
                md: '2.35rem',
              },
              mb: { xs: fillMain ? 0.5 : 0.75, sm: 0.75 },
            }}
          >
            Resume Job Finder
          </Typography>
          <Typography
            variant="body2"
            sx={{
              display: { xs: fillMain ? 'none' : 'block', sm: 'block' },
              maxWidth: 480,
              mx: 'auto',
              opacity: 0.92,
              lineHeight: 1.5,
              mb: { xs: 1.25, sm: 2 },
              fontSize: { xs: '0.85rem', sm: '0.875rem' },
            }}
          >
            Upload your resume to find matching roles across startups, mid-level companies, and
            enterprises.
          </Typography>

          <Tabs
            value={tabValue}
            centered
            textColor="inherit"
            slotProps={{
              indicator: { style: { backgroundColor: 'white' } },
            }}
            sx={{
              minHeight: { xs: 36, sm: 40 },
              '& .MuiTab-root': {
                color: 'rgba(255,255,255,0.75)',
                minHeight: { xs: 36, sm: 40 },
                fontWeight: 600,
                fontSize: { xs: '0.85rem', sm: '0.875rem' },
                px: { xs: 1.5, sm: 2 },
              },
              '& .Mui-selected': { color: 'white' },
            }}
          >
            <Tab label="Find jobs" value="/" component={NavLink} to="/" end />
            <Tab label="History" value="/history" component={NavLink} to="/history" />
          </Tabs>
        </Container>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          py: { xs: fillMain ? 1.5 : 2.5, sm: 3, md: 4 },
          overflow: fillMain ? 'hidden' : 'auto',
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            ...(fillMain && {
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }),
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
}

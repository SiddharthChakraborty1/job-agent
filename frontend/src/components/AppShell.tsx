import { NavLink, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Container from '@mui/material/Container';
import { alpha } from '@mui/material/styles';
import { BrandMark } from './BrandMark';
import { DarkModeToggle } from './DarkModeToggle';
import { UserMenu } from './UserMenu';

interface AppShellProps {
  children: React.ReactNode;
  /** The page manages its own scrolling and should fill the viewport exactly. */
  fillMain?: boolean;
}

const NAV_ITEMS = [
  { label: 'Find jobs', to: '/' },
  { label: 'History', to: '/history' },
];

function NavPills({ active }: { active: string }) {
  return (
    <Box
      component="nav"
      sx={{
        display: 'flex',
        gap: 0.5,
        p: 0.5,
        borderRadius: 999,
        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.to === active;
        return (
          <ButtonBase
            key={item.to}
            component={NavLink}
            to={item.to}
            end={item.to === '/'}
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: 0.65,
              borderRadius: 999,
              fontSize: '0.8125rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              color: isActive ? 'text.primary' : 'text.secondary',
              bgcolor: isActive ? 'background.paper' : 'transparent',
              boxShadow: isActive
                ? (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 1px 2px rgba(0,0,0,0.6)'
                      : '0 1px 2px rgba(15,23,42,0.12)'
                : 'none',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              '&:hover': { color: 'text.primary' },
            }}
          >
            {item.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

export function AppShell({ children, fillMain = false }: AppShellProps) {
  const location = useLocation();
  const active = location.pathname.startsWith('/history') ? '/history' : '/';

  return (
    <Box
      sx={{
        height: '100dvh',
        maxHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <Box
        component="header"
        sx={{
          flexShrink: 0,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.85),
          backdropFilter: 'blur(12px)',
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1, sm: 2 },
            px: { xs: 1.5, sm: 3 },
          }}
        >
          <BrandMark compact />
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <NavPills active={active} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DarkModeToggle />
            <UserMenu />
          </Box>
        </Container>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: fillMain ? 'hidden' : 'auto',
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 1.5, sm: 3 },
            py: fillMain ? { xs: 1.5, sm: 2 } : { xs: 3, sm: 5 },
            ...(fillMain && { overflow: 'hidden' }),
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
}

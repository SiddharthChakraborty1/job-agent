import { createTheme, alpha, type PaletteMode } from '@mui/material/styles';

const sharedTheme = {
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h2: {
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    button: {
      textTransform: 'none' as const,
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          height: '100%',
          overflow: 'hidden',
        },
        body: {
          height: '100%',
          overflow: 'hidden',
        },
        '#root': {
          height: '100%',
          overflow: 'hidden',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            backgroundColor: alpha('#6366f1', 0.06),
          },
        },
      },
    },
  },
};

export function getTheme(mode: PaletteMode) {
  return createTheme({
    ...sharedTheme,
    palette: {
      mode,
      primary: {
        main: '#6366f1',
        light: '#818cf8',
        dark: '#4f46e5',
      },
      secondary: {
        main: '#0ea5e9',
      },
      ...(mode === 'light'
        ? {
            background: {
              default: '#f1f5f9',
              paper: '#ffffff',
            },
            text: {
              primary: '#0f172a',
              secondary: '#64748b',
            },
          }
        : {
            background: {
              default: '#0f172a',
              paper: '#1e293b',
            },
            text: {
              primary: '#f1f5f9',
              secondary: '#94a3b8',
            },
          }),
      success: {
        main: '#10b981',
      },
      warning: {
        main: '#f59e0b',
      },
      error: {
        main: '#ef4444',
      },
    },
  });
}

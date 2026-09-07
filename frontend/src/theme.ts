import { createTheme, alpha, type PaletteMode } from '@mui/material/styles';

const INDIGO = '#4f46e5';
const INDIGO_LIGHT = '#818cf8';

export function getTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';
  const primaryMain = isDark ? INDIGO_LIGHT : INDIGO;
  const divider = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.09)';
  const canvas = isDark ? '#0a0d14' : '#f6f7f9';
  const surface = isDark ? '#121721' : '#ffffff';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryMain,
        light: isDark ? '#a5b4fc' : INDIGO_LIGHT,
        dark: isDark ? '#6366f1' : '#4338ca',
      },
      secondary: { main: isDark ? '#38bdf8' : '#0284c7' },
      success: { main: isDark ? '#34d399' : '#059669' },
      warning: { main: isDark ? '#fbbf24' : '#d97706' },
      error: { main: isDark ? '#f87171' : '#dc2626' },
      info: { main: isDark ? '#60a5fa' : '#2563eb' },
      divider,
      background: { default: canvas, paper: surface },
      text: {
        primary: isDark ? '#e8ecf5' : '#0d1526',
        secondary: isDark ? '#9aa5b8' : '#5a6472',
        disabled: isDark ? '#6b7688' : '#8c94a3',
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.03em' },
      h2: { fontWeight: 700, letterSpacing: '-0.025em' },
      h3: { fontWeight: 700, letterSpacing: '-0.025em' },
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 650, letterSpacing: '-0.02em' },
      h6: { fontWeight: 650, letterSpacing: '-0.015em' },
      subtitle1: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle2: { fontWeight: 600 },
      body2: { lineHeight: 1.55 },
      caption: { letterSpacing: 0 },
      button: { textTransform: 'none' as const, fontWeight: 600, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { height: '100%', overflow: 'hidden' },
          body: {
            height: '100%',
            overflow: 'hidden',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '#root': { height: '100%', overflow: 'hidden' },
          '*::selection': {
            background: alpha(primaryMain, 0.25),
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10 },
          sizeSmall: { padding: '5px 12px', fontSize: '0.8125rem' },
          sizeMedium: { padding: '8px 16px' },
          sizeLarge: { padding: '11px 22px', fontSize: '0.95rem' },
          outlined: { borderColor: divider },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 10 } },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: { borderRadius: 14, borderColor: divider },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600 },
          sizeSmall: { height: 22, fontSize: '0.72rem' },
          label: { paddingLeft: 8, paddingRight: 8 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 10 },
          notchedOutline: { borderColor: divider },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12, alignItems: 'center' },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { borderRadius: 8, fontSize: '0.75rem', paddingBlock: 6 },
        },
      },
      MuiLink: {
        defaultProps: { underline: 'hover' },
        styleOverrides: { root: { fontWeight: 600 } },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            border: `1px solid ${divider}`,
            boxShadow: isDark
              ? '0 12px 32px rgba(0,0,0,0.5)'
              : '0 12px 32px rgba(15,23,42,0.12)',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: { root: { borderRadius: 8, margin: '2px 6px', fontSize: '0.875rem' } },
      },
    },
  });
}

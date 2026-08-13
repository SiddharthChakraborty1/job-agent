import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useColorMode } from '../ColorModeContext';

export function DarkModeToggle() {
  const { mode, toggleColorMode } = useColorMode();
  const isDark = mode === 'dark';

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        onClick={toggleColorMode}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        sx={{
          position: 'absolute',
          top: { xs: 12, md: 16 },
          right: { xs: 12, md: 16 },
          color: 'white',
          bgcolor: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)',
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.22)',
          },
        }}
      >
        {isDark ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
}

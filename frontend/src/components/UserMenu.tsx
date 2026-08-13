import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!user) return null;

  const open = Boolean(anchorEl);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: { xs: 12, md: 16 },
        left: { xs: 12, md: 16 },
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Tooltip title="Account">
        <IconButton
          onClick={(event) => setAnchorEl(event.currentTarget)}
          aria-label="Open account menu"
          sx={{
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
          }}
        >
          <Avatar src={user.picture ?? undefined} alt={user.name} sx={{ width: 28, height: 28 }}>
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ px: 2, py: 1.5, maxWidth: 260 }}>
          <Typography variant="subtitle2">{user.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
        </Box>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            void logout();
          }}
        >
          <LogoutOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
          Sign out
        </MenuItem>
      </Menu>
    </Box>
  );
}

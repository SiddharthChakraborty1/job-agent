import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!user) return null;

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title={user.name}>
        <IconButton
          onClick={(event) => setAnchorEl(event.currentTarget)}
          aria-label="Open account menu"
          size="small"
          sx={{
            p: 0.25,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Avatar
            src={user.picture ?? undefined}
            alt={user.name}
            sx={{ width: 28, height: 28, fontSize: '0.85rem', fontWeight: 600 }}
          >
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
      >
        <Box sx={{ px: 2, py: 1.25, maxWidth: 280 }}>
          <Typography variant="subtitle2" noWrap>
            {user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {user.email}
          </Typography>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        {location.pathname.startsWith('/admin') && (
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              navigate('/');
            }}
          >
            <WorkOutlineOutlinedIcon fontSize="small" sx={{ mr: 1.25, fontSize: 18 }} />
            Job finder
          </MenuItem>
        )}
        {user.isAdmin && !location.pathname.startsWith('/admin') && (
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              navigate('/admin');
            }}
          >
            <AdminPanelSettingsOutlinedIcon fontSize="small" sx={{ mr: 1.25, fontSize: 18 }} />
            Admin
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            void logout();
          }}
        >
          <LogoutOutlinedIcon fontSize="small" sx={{ mr: 1.25, fontSize: 18 }} />
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}

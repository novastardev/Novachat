import { useState } from 'react';
import { Box, Button, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import MenuRounded from '@mui/icons-material/MenuRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import AddCommentOutlined from '@mui/icons-material/AddCommentOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import LoginRounded from '@mui/icons-material/LoginRounded';
import { beginNovaStackLogin } from '../lib/novastack-oauth';

interface Props {
  title?: string;
  onOpenDrawer: () => void;
  onNewChat: () => void;
  onOpenSettings?: () => void;
  isSignedIn?: boolean;
}

export default function TopBar({ title, onOpenDrawer, onNewChat, onOpenSettings, isSignedIn = false }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [loginError, setLoginError] = useState('');
  const close = () => setAnchor(null);

  const login = async () => {
    setLoginError('');
    try {
      await beginNovaStackLogin();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Could not start NovaStack sign-in.');
      setAnchor(null);
    }
  };

  return (
    <Box component="header" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, minHeight: 56 }}>
      <IconButton aria-label="Open menu" onClick={onOpenDrawer}><MenuRounded /></IconButton>
      <Typography component="h2" variant="subtitle1" sx={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>{title}</Typography>
      {!isSignedIn && <Button size="small" startIcon={<LoginRounded />} onClick={login} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>Sign in</Button>}
      <IconButton aria-label="More options" onClick={(e) => setAnchor(e.currentTarget)}><MoreVertRounded /></IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem onClick={() => { close(); onNewChat(); }}>
          <ListItemIcon><AddCommentOutlined fontSize="small" /></ListItemIcon><ListItemText>New chat</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { close(); onOpenSettings?.(); }}>
          <ListItemIcon><SettingsOutlined fontSize="small" /></ListItemIcon><ListItemText>Settings</ListItemText>
        </MenuItem>
      </Menu>
      {loginError && <Typography role="alert" color="error" variant="caption" sx={{ position: 'absolute', top: 56, right: 12, maxWidth: 320, zIndex: 10 }}>{loginError}</Typography>}
    </Box>
  );
}

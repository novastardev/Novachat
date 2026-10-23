import { useState } from 'react';
import { Box, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import MenuRounded from '@mui/icons-material/MenuRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import AddCommentOutlined from '@mui/icons-material/AddCommentOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import VpnKeyOutlined from '@mui/icons-material/VpnKeyOutlined';

interface Props {
  title?: string;
  onOpenDrawer: () => void;
  onNewChat: () => void;
  onOpenSettings?: () => void;
  onConnectNovaStack?: () => void;
}

export default function TopBar({ title, onOpenDrawer, onNewChat, onOpenSettings, onConnectNovaStack }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  return (
    <Box component="header" sx={{ display: 'flex', alignItems: 'center', px: 1, minHeight: 56 }}>
      <IconButton aria-label="Open menu" onClick={onOpenDrawer}>
        <MenuRounded />
      </IconButton>

      <Typography component="h2" variant="subtitle1" sx={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>
        {title}
      </Typography>

      <IconButton aria-label="More options" onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreVertRounded />
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            close();
            onNewChat();
          }}
        >
          <ListItemIcon>
            <AddCommentOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>New chat</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            onOpenSettings?.();
          }}
        >
          <ListItemIcon>
            <SettingsOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            onConnectNovaStack?.();
          }}
        >
          <ListItemIcon>
            <VpnKeyOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Connect NovaStack</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

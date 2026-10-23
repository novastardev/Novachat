import type { ReactNode } from 'react';
import { Avatar, Box, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import EmojiEmotionsOutlined from '@mui/icons-material/EmojiEmotionsOutlined';
import ExtensionOutlined from '@mui/icons-material/ExtensionOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import BotAvatar from './BotAvatar';
import type { NovaStackUserProfile } from '../lib/novastack-oauth';

interface DrawerItem {
  key: string;
  label: string;
  icon: ReactNode;
}

const items: DrawerItem[] = [
  { key: 'personality', label: 'Personality', icon: <EmojiEmotionsOutlined /> },
  { key: 'images', label: 'Images', icon: <ImageOutlined /> },
  { key: 'files', label: 'Files', icon: <FolderOutlined /> },
  { key: 'schedules', label: 'Schedules', icon: <ScheduleOutlined /> },
  { key: 'plugins', label: 'Plugins', icon: <ExtensionOutlined /> },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect?: (key: string) => void;
  user?: NovaStackUserProfile | null;
}

export default function SideDrawer({ open, onClose, onSelect, user }: Props) {
  const avatarUrl = user?.picture || user?.image || user?.avatar || '';
  const username = user?.preferred_username || user?.username || user?.name || user?.email || 'Signed-in user';
  const initials = username.replace(/^@/, '').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: 300, maxWidth: '85vw' } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2.5 }}>
        <BotAvatar size={40} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Nova
        </Typography>
      </Box>
      <Divider />
      {user && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2, minWidth: 0 }}>
          <Avatar
            src={avatarUrl || undefined}
            alt={username}
            imgProps={{ referrerPolicy: 'no-referrer' }}
            sx={{ width: 42, height: 42, flexShrink: 0, fontWeight: 700, bgcolor: 'primary.main' }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 650, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {username.startsWith('@') ? username : username.includes('@') ? username : '@' + username}
            </Typography>
            {user.email && (
              <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                {user.email}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      <Divider />
      <List sx={{ px: 1, py: 1.5 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.key}
            sx={{ borderRadius: 3 }}
            onClick={() => {
              onSelect?.(item.key);
              onClose();
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}

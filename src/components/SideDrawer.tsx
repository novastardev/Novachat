import type { ReactNode } from 'react';
import { Box, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import EmojiEmotionsOutlined from '@mui/icons-material/EmojiEmotionsOutlined';
import ExtensionOutlined from '@mui/icons-material/ExtensionOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import BotAvatar from './BotAvatar';

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
}

export default function SideDrawer({ open, onClose, onSelect }: Props) {
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

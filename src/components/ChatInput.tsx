import { useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import {
  Badge,
  Box,
  Chip,
  Divider,
  IconButton,
  InputBase,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ExtensionOutlined from '@mui/icons-material/ExtensionOutlined';
import GraphicEq from '@mui/icons-material/GraphicEq';
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined';
import MicNoneOutlined from '@mui/icons-material/MicNoneOutlined';
import PhotoLibraryOutlined from '@mui/icons-material/PhotoLibraryOutlined';
import PsychologyOutlined from '@mui/icons-material/PsychologyOutlined';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import VoiceRecorderBar from './VoiceRecorderBar';
import type { ComposerOptions, SendPayload } from '../types';

interface Props {
  onSend: (payload: SendPayload) => void;
  onLiveMode: () => void;
}

const circleButton = {
  width: 48,
  height: 48,
  bgcolor: 'background.paper',
  border: 1,
  borderColor: 'divider',
  '&:hover': { bgcolor: 'background.paper', borderColor: 'primary.main' },
} as const;

export default function ChatInput({ onSend, onLiveMode }: Props) {
  const [text, setText] = useState('');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [options, setOptions] = useState<ComposerOptions>({ thinkHarder: false, webSearch: false });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [recording, setRecording] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const hasContent = text.trim().length > 0 || attachments.length > 0;
  const anyOptionOn = options.thinkHarder || options.webSearch;
  const closeMenu = () => setAnchor(null);

  const submit = () => {
    if (!hasContent) return;
    onSend({ text: text.trim(), options, attachments });
    setText('');
    setAttachments([]);
  };

  const addFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) setAttachments((prev) => [...prev, ...picked]);
    e.target.value = '';
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const isDesktop = window.matchMedia('(pointer: fine)').matches;
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && isDesktop) {
      e.preventDefault();
      submit();
    }
  };

  const toggle = (key: keyof ComposerOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    closeMenu();
  };

  return (
    <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: { xs: 1.5, sm: 2.5 } }}>
      <Box sx={{ maxWidth: 760, mx: 'auto' }}>
        {recording ? (
          <VoiceRecorderBar
            onCancel={() => setRecording(false)}
            onDone={() => {
              // TODO: send the recorded audio (MediaRecorder) to your backend.
              setRecording(false);
            }}
          />
        ) : (
          <>
            {(attachments.length > 0 || anyOptionOn) && (
              <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1.25, px: 0.5 }}>
                {attachments.map((file, i) => (
                  <Chip
                    key={`${file.name}-${i}`}
                    size="small"
                    label={file.name}
                    sx={{ maxWidth: 200 }}
                    onDelete={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
                {options.thinkHarder && (
                  <Chip
                    size="small"
                    color="secondary"
                    variant="outlined"
                    icon={<PsychologyOutlined />}
                    label="Think harder"
                    onDelete={() => setOptions((p) => ({ ...p, thinkHarder: false }))}
                  />
                )}
                {options.webSearch && (
                  <Chip
                    size="small"
                    color="secondary"
                    variant="outlined"
                    icon={<PublicOutlined />}
                    label="Web search"
                    onDelete={() => setOptions((p) => ({ ...p, webSearch: false }))}
                  />
                )}
              </Stack>
            )}

            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <Badge variant="dot" color="secondary" overlap="circular" invisible={!anyOptionOn}>
                <IconButton aria-label="Attach" sx={circleButton} onClick={(e) => setAnchor(e.currentTarget)}>
                  <AddRounded />
                </IconButton>
              </Badge>

              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 48,
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  borderRadius: '24px',
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  '&:focus-within': { borderColor: 'primary.main' },
                }}
              >
                <InputBase
                  multiline
                  maxRows={6}
                  fullWidth
                  placeholder="Message Nova"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKeyDown}
                  inputProps={{ 'aria-label': 'Message Nova' }}
                  sx={{ py: 0.5 }}
                />
              </Box>

              <IconButton
                aria-label="Record a voice message"
                sx={circleButton}
                onClick={() => setRecording(true)}
              >
                <MicNoneOutlined />
              </IconButton>

              <IconButton
                aria-label={hasContent ? 'Send message' : 'Start live mode'}
                onClick={hasContent ? submit : onLiveMode}
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'primary.main',
                  color: 'background.default',
                  '&:hover': { bgcolor: 'primary.light' },
                }}
              >
                {hasContent ? <ArrowUpward /> : <GraphicEq />}
              </IconButton>
            </Box>
          </>
        )}
      </Box>

      <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={addFiles} />
      <input ref={fileInput} type="file" multiple hidden onChange={addFiles} />

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ '& .MuiPaper-root': { width: 248, mt: -1 } }}
      >
        <MenuItem
          onClick={() => {
            closeMenu();
            photoInput.current?.click();
          }}
        >
          <ListItemIcon>
            <PhotoLibraryOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Photos</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu();
            fileInput.current?.click();
          }}
        >
          <ListItemIcon>
            <InsertDriveFileOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Files</ListItemText>
        </MenuItem>
        <MenuItem onClick={closeMenu /* TODO: open your plugins screen */}>
          <ListItemIcon>
            <ExtensionOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Plugins</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={() => toggle('thinkHarder')}>
          <ListItemIcon>
            <PsychologyOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Think harder</ListItemText>
          {options.thinkHarder && <CheckRounded fontSize="small" color="secondary" />}
        </MenuItem>
        <MenuItem onClick={() => toggle('webSearch')}>
          <ListItemIcon>
            <PublicOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Web search</ListItemText>
          {options.webSearch && <CheckRounded fontSize="small" color="secondary" />}
        </MenuItem>
      </Menu>
    </Box>
  );
}

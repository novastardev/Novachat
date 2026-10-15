import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import {
  Badge,
  Box,
  Divider,
  IconButton,
  InputBase,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ExtensionOutlined from '@mui/icons-material/ExtensionOutlined';
import GraphicEq from '@mui/icons-material/GraphicEq';
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined';
import MicNoneOutlined from '@mui/icons-material/MicNoneOutlined';
import PauseRounded from '@mui/icons-material/PauseRounded';
import PhotoLibraryOutlined from '@mui/icons-material/PhotoLibraryOutlined';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import PsychologyOutlined from '@mui/icons-material/PsychologyOutlined';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import AttachmentPreview from './AttachmentPreview';
import OptionPill from './OptionPill';
import RecordingWave from './RecordingWave';
import SwapIcon from './SwapIcon';
import { transcribeAudio } from '../lib/transcribe';
import { useVoiceRecorder } from '../lib/useVoiceRecorder';
import type { Attachment, AttachmentKind, ComposerOptions, SendPayload } from '../types';

interface Props {
  onSend: (payload: SendPayload) => void;
  onLiveMode: () => void;
}

const reduceMotion = { '@media (prefers-reduced-motion: reduce)': { transition: 'none' } } as const;

const kindOf = (file: File): AttachmentKind =>
  file.type.startsWith('image/') ? 'photo' : file.type.startsWith('video/') ? 'video' : 'file';

const revokePreviews = (items: Attachment[]) =>
  items.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));

const circleButton = {
  width: 48,
  height: 48,
  bgcolor: 'background.paper',
  border: 1,
  borderColor: 'divider',
  transition: 'background-color 150ms ease, border-color 200ms ease',
  '&:hover': { bgcolor: 'background.paper', borderColor: 'primary.main' },
  ...reduceMotion,
} as const;

export default function ChatInput({ onSend, onLiveMode }: Props) {
  const [text, setText] = useState('');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [options, setOptions] = useState<ComposerOptions>({ thinkHarder: false, webSearch: false });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recorder = useVoiceRecorder();
  const startingRef = useRef(false);
  const transcribeAbort = useRef<AbortController | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const hasContent = text.trim().length > 0 || attachments.length > 0;
  const anyOptionOn = options.thinkHarder || options.webSearch;
  const closeMenu = () => setAnchor(null);

  // Free preview object URLs when the component unmounts.
  const attachmentsRef = useRef<Attachment[]>([]);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  useEffect(() => () => revokePreviews(attachmentsRef.current), []);

  useEffect(() => {
    if (!recording || paused) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording, paused]);

  // Stop an in-flight transcription if the composer unmounts.
  useEffect(
    () => () => {
      transcribeAbort.current?.abort();
    },
    [],
  );

  const startRecording = async () => {
    if (startingRef.current || transcribing) return;
    startingRef.current = true;
    setVoiceError('');
    try {
      await recorder.start();
      setSeconds(0);
      setPaused(false);
      setRecording(true);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Could not start recording.');
    } finally {
      startingRef.current = false;
    }
  };

  // Cancel: throw the recording away.
  const stopRecording = () => {
    recorder.cancel();
    setRecording(false);
    setPaused(false);
  };

  const togglePause = () => {
    if (paused) recorder.resume();
    else recorder.pause();
    setPaused((p) => !p);
  };

  // Finish (check mark): transcribe the recording and drop the text into the input box.
  const finishRecording = async () => {
    const audio = await recorder.stop();
    setRecording(false);
    setPaused(false);
    if (!audio) {
      setVoiceError('No audio was captured. Please try again.');
      return;
    }

    const controller = new AbortController();
    transcribeAbort.current = controller;
    setTranscribing(true);
    try {
      const transcript = await transcribeAudio(audio, { signal: controller.signal });
      if (!transcript) {
        setVoiceError("Couldn't make out any speech. Please try again.");
      } else {
        setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${transcript}` : transcript));
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setVoiceError(err instanceof Error ? err.message : 'Transcription failed.');
      }
    } finally {
      transcribeAbort.current = null;
      setTranscribing(false);
    }
  };

  const submit = () => {
    if (!hasContent) return;
    onSend({ text: text.trim(), options, attachments: attachments.map((a) => a.file) });
    revokePreviews(attachments);
    setText('');
    setAttachments([]);
  };

  const addFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).map<Attachment>((file) => {
      const kind = kindOf(file);
      return {
        id: crypto.randomUUID(),
        file,
        kind,
        previewUrl: kind === 'file' ? undefined : URL.createObjectURL(file),
      };
    });
    if (picked.length) setAttachments((prev) => [...prev, ...picked]);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    const gone = attachments.find((a) => a.id === id);
    if (gone) revokePreviews([gone]);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const micState = !recording ? 'mic' : paused ? 'play' : 'pause';
  const actionState = recording ? 'done' : hasContent ? 'send' : 'live';

  const onAction = () => {
    if (transcribing) return;
    if (recording) void finishRecording();
    else if (hasContent) submit();
    else onLiveMode();
  };

  const onMic = () => {
    if (transcribing) return;
    if (recording) togglePause();
    else void startRecording();
  };

  const actionLabel = recording ? 'Finish recording' : hasContent ? 'Send message' : 'Start live mode';
  const micLabel = !recording ? 'Record a voice message' : paused ? 'Resume recording' : 'Pause recording';

  return (
    <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: { xs: 1.5, sm: 2.5 } }}>
      <Box sx={{ maxWidth: 760, mx: 'auto' }}>
        {anyOptionOn && (
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, flexWrap: 'wrap', mb: 1.25, px: 0.5 }}>
            {options.thinkHarder && (
              <OptionPill
                icon={<PsychologyOutlined />}
                label="Think harder"
                onRemove={() => setOptions((p) => ({ ...p, thinkHarder: false }))}
              />
            )}
            {options.webSearch && (
              <OptionPill
                icon={<PublicOutlined />}
                label="Web search"
                onRemove={() => setOptions((p) => ({ ...p, webSearch: false }))}
              />
            )}
          </Box>
        )}

        {/* Floating pill with photo, video and file previews */}
        <AttachmentPreview items={attachments} onRemove={removeAttachment} />

        {voiceError && (
          <Typography role="alert" variant="caption" color="error.light" sx={{ display: 'block', mb: 1, px: 1 }}>
            {voiceError}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          {/* Attach: the + rotates 45deg into an X that cancels the recording */}
          <Badge variant="dot" color="primary" overlap="circular" invisible={!anyOptionOn || recording}>
            <IconButton
              aria-label={recording ? 'Cancel recording' : 'Attach'}
              sx={circleButton}
              onClick={(e) => (recording ? stopRecording() : setAnchor(e.currentTarget))}
            >
              <AddRounded
                sx={{
                  transition: 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                  transform: recording ? 'rotate(45deg)' : 'rotate(0deg)',
                  ...reduceMotion,
                }}
              />
            </IconButton>
          </Badge>

          {/* Input pill: text field cross-fades into the waveform while recording */}
          <Box
            sx={{
              position: 'relative',
              flex: 1,
              minWidth: 0,
              minHeight: 48,
              display: 'flex',
              alignItems: 'center',
              px: 2,
              borderRadius: '24px',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: recording ? 'primary.main' : 'divider',
              transition: 'border-color 200ms ease',
              '&:focus-within': { borderColor: 'primary.main' },
              ...reduceMotion,
            }}
          >
            <InputBase
              multiline
              maxRows={6}
              fullWidth
              placeholder={transcribing ? 'Transcribing…' : 'Message Nova'}
              value={text}
              disabled={recording}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              inputProps={{ 'aria-label': 'Message Nova' }}
              sx={{
                py: 0.5,
                opacity: recording ? 0 : 1,
                transition: 'opacity 180ms ease',
                ...reduceMotion,
              }}
            />
            <Box
              aria-hidden={!recording}
              sx={{
                position: 'absolute',
                inset: 0,
                px: 2,
                display: 'flex',
                alignItems: 'center',
                opacity: recording ? 1 : 0,
                pointerEvents: recording ? 'auto' : 'none',
                transition: 'opacity 220ms ease',
                ...reduceMotion,
              }}
            >
              <RecordingWave active={recording} paused={paused} seconds={seconds} />
            </Box>
          </Box>

          {/* Mic button: becomes pause / resume while recording */}
          <IconButton
            aria-label={micLabel}
            sx={{ ...circleButton, borderColor: recording ? 'primary.main' : 'divider' }}
            disabled={transcribing}
            onClick={onMic}
          >
            <SwapIcon
              active={micState}
              icons={{
                mic: <MicNoneOutlined />,
                pause: <PauseRounded />,
                play: <PlayArrowRounded />,
              }}
            />
          </IconButton>

          {/* Action button: live mode, send, or done (check) while recording */}
          <IconButton
            aria-label={actionLabel}
            onClick={onAction}
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'primary.main',
              color: 'background.default',
              '&:hover': { bgcolor: 'primary.light' },
            }}
          >
            <SwapIcon
              active={actionState}
              icons={{
                live: <GraphicEq />,
                send: <ArrowUpward />,
                done: <CheckRounded />,
              }}
            />
          </IconButton>
        </Box>
      </Box>

      <input ref={photoInput} type="file" accept="image/*,video/*" multiple hidden onChange={addFiles} />
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
          <ListItemText>Photos &amp; videos</ListItemText>
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

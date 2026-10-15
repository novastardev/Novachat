import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import PauseRounded from '@mui/icons-material/PauseRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';

const BAR = 3;
const GAP = 3;

function formatTime(totalSeconds: number) {
  const safe = Number.isFinite(totalSeconds) ? totalSeconds : 0;
  const m = Math.floor(safe / 60).toString().padStart(2, '0');
  const s = Math.floor(safe % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface Props {
  /** URL (blob: or regular) of the audio to play. Undefined while still generating. */
  src?: string;
  /** True while the audio is being generated — shows a spinner instead of the waveform. */
  loading?: boolean;
  /** Set when generating the audio failed; shown in place of the waveform. */
  error?: string;
  onClose: () => void;
  /** Called if PLAYBACK fails after the audio has already loaded (separate from `error`,
   *  which covers generation failing before there's anything to play). */
  onError?: (message: string) => void;
}

/**
 * Playback bar for a generated voice reply: play/pause, a static waveform that
 * fills in as the track progresses, elapsed time, and a close button. Mirrors
 * the look of a sent voice message bubble, but reads from a real <audio> element.
 */
export default function VoicePlaybackBar({ src, loading, error, onClose, onError }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const [barCount, setBarCount] = useState(28);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const el = waveRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const fit = Math.floor((entry.contentRect.width + GAP) / (BAR + GAP));
      setBarCount(Math.min(80, Math.max(12, fit)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A stable-looking waveform shape (not random each render) sized to the bar count.
  const heights = useMemo(
    () => Array.from({ length: barCount }, (_, i) => 6 + Math.round(Math.abs(Math.sin(i * 1.9)) * 14)),
    [barCount],
  );

  useEffect(() => {
    if (!src) return undefined;
    const audio = new Audio(src);
    audioRef.current = audio;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setPosition(audio.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setPosition(0);
    };
    const onPlayError = () => {
      setPlaying(false);
      onError?.('Could not play the audio.');
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onPlayError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onPlayError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(onPlayError);
    }
  };

  const onPlayError = () => {
    setPlaying(false);
    onError?.('Could not play the audio.');
  };

  const progress = duration > 0 ? position / duration : 0;
  const filledBars = Math.round(progress * barCount);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minHeight: 48,
        px: 1,
        py: 0.5,
        borderRadius: '24px',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        maxWidth: 320,
        width: '100%',
      }}
    >
      <IconButton
        size="small"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={toggle}
        disabled={loading || Boolean(error) || !src}
        sx={{
          width: 32,
          height: 32,
          bgcolor: 'primary.main',
          color: 'background.default',
          flexShrink: 0,
          '&:hover': { bgcolor: 'primary.light' },
          '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
        }}
      >
        {playing ? <PauseRounded sx={{ fontSize: 18 }} /> : <PlayArrowRounded sx={{ fontSize: 18 }} />}
      </IconButton>

      {loading ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <CircularProgress size={16} thickness={5} sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            Generating…
          </Typography>
        </Box>
      ) : error ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <ErrorOutlineRounded sx={{ fontSize: 16, color: 'error.light', flexShrink: 0 }} />
          <Typography variant="body2" color="error.light" noWrap>
            {error}
          </Typography>
        </Box>
      ) : (
        <>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(position)}
          </Typography>

          <Box
            ref={waveRef}
            aria-hidden
            sx={{
              flex: 1,
              minWidth: 0,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              gap: `${GAP}px`,
              overflow: 'hidden',
              cursor: src ? 'pointer' : 'default',
            }}
            onClick={(e) => {
              const audio = audioRef.current;
              if (!audio || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
              audio.currentTime = ratio * duration;
              setPosition(audio.currentTime);
            }}
          >
            {heights.map((h, i) => (
              <Box
                key={i}
                sx={{
                  width: BAR,
                  height: h,
                  flexShrink: 0,
                  borderRadius: 2,
                  bgcolor: i < filledBars ? 'primary.main' : 'divider',
                  transition: 'background-color 120ms linear',
                }}
              />
            ))}
          </Box>
        </>
      )}

      <IconButton size="small" aria-label="Close" onClick={onClose} sx={{ flexShrink: 0 }}>
        <CloseRounded sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
}

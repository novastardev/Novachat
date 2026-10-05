import { useEffect, useMemo, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import PauseRounded from '@mui/icons-material/PauseRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';

const wave = keyframes`
  0%, 100% { transform: scaleY(0.25); }
  50% { transform: scaleY(1); }
`;

const BAR_COUNT = 28;

function formatTime(total: number) {
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface Props {
  onCancel: () => void;
  onDone: (seconds: number) => void;
}

export default function VoiceRecorderBar({ onCancel, onDone }: Props) {
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [paused]);

  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => ({
        height: 10 + Math.round(Math.abs(Math.sin(i * 1.7)) * 18),
        delay: -((i * 0.13) % 1.2),
      })),
    [],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minHeight: 56,
        p: 0.75,
        borderRadius: '28px',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
      }}
    >
      <IconButton aria-label="Cancel recording" onClick={onCancel}>
        <CloseRounded />
      </IconButton>

      <Box
        aria-hidden
        sx={{
          flex: 1,
          minWidth: 0,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          overflow: 'hidden',
        }}
      >
        {bars.map((bar, i) => (
          <Box
            key={i}
            sx={{
              width: 3,
              height: bar.height,
              flexShrink: 0,
              borderRadius: 2,
              bgcolor: paused ? 'text.secondary' : 'primary.main',
              animation: `${wave} 1.1s ease-in-out infinite`,
              animationDelay: `${bar.delay}s`,
              animationPlayState: paused ? 'paused' : 'running',
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          />
        ))}
      </Box>

      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
        {formatTime(seconds)}
      </Typography>

      <IconButton
        aria-label={paused ? 'Resume recording' : 'Pause recording'}
        onClick={() => setPaused((p) => !p)}
      >
        {paused ? <PlayArrowRounded /> : <PauseRounded />}
      </IconButton>

      <IconButton
        aria-label="Finish recording"
        onClick={() => onDone(seconds)}
        sx={{
          bgcolor: 'primary.main',
          color: 'background.default',
          '&:hover': { bgcolor: 'primary.light' },
        }}
      >
        <CheckRounded />
      </IconButton>
    </Box>
  );
}

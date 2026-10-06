import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';

const wave = keyframes`
  0%, 100% { transform: scaleY(0.25); }
  50% { transform: scaleY(1); }
`;

const BAR = 3;
const GAP = 2;

function formatTime(total: number) {
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface Props {
  /** True while a recording session is open. */
  active: boolean;
  paused: boolean;
  seconds: number;
}

/** Waveform and timer shown inside the input pill while recording. */
export default function RecordingWave({ active, paused, seconds }: Props) {
  const waveRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(20);

  // Fit as many bars as the available width allows.
  useEffect(() => {
    const el = waveRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const fit = Math.floor((entry.contentRect.width + GAP) / (BAR + GAP));
      setCount(Math.min(100, Math.max(8, fit)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        height: 8 + Math.round(Math.abs(Math.sin(i * 1.7)) * 16),
        delay: -((i * 0.13) % 1.2),
      })),
    [count],
  );

  const running = active && !paused;

  return (
    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        ref={waveRef}
        sx={{
          flex: 1,
          minWidth: 0,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${GAP}px`,
          overflow: 'hidden',
        }}
      >
        {bars.map((bar, i) => (
          <Box
            key={i}
            sx={{
              width: BAR,
              height: bar.height,
              flexShrink: 0,
              borderRadius: 2,
              bgcolor: paused ? 'text.secondary' : 'primary.main',
              transition: 'background-color 200ms ease',
              animation: `${wave} 1.1s ease-in-out infinite`,
              animationDelay: `${bar.delay}s`,
              animationPlayState: running ? 'running' : 'paused',
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          />
        ))}
      </Box>

      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
        {formatTime(seconds)}
      </Typography>
    </Box>
  );
}

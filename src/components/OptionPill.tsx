import type { ReactNode } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import CloseRounded from '@mui/icons-material/CloseRounded';

const pop = keyframes`
  from { opacity: 0; transform: translateY(6px) scale(0.92); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const sheen = keyframes`
  from { transform: translateX(-130%); }
  to { transform: translateX(380%); }
`;

interface Props {
  icon: ReactNode;
  label: string;
  onRemove: () => void;
}

/** Gradient-outlined pill for active composer options such as Web search. */
export default function OptionPill({ icon, label, onRemove }: Props) {
  return (
    <Box
      role="group"
      aria-label={label}
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        height: 36,
        pl: 0.5,
        pr: 0.5,
        overflow: 'hidden',
        borderRadius: '18px',
        border: '1px solid transparent',
        // Tint over the solid fill, with a primary-to-secondary gradient showing through the border.
        background: (t) =>
          `linear-gradient(${alpha(t.palette.primary.main, 0.14)}, ${alpha(t.palette.primary.main, 0.14)}) padding-box, ` +
          `linear-gradient(${t.palette.background.paper}, ${t.palette.background.paper}) padding-box, ` +
          `linear-gradient(120deg, ${t.palette.primary.main}, ${t.palette.secondary.main}) border-box`,
        boxShadow: (t) => `0 0 20px ${alpha(t.palette.primary.main, 0.25)}`,
        animation: `${pop} 260ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {/* One light sweep when the pill appears */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '30%',
          pointerEvents: 'none',
          background: 'linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.22), transparent)',
          animation: `${sheen} 900ms 200ms ease-out 1 both`,
          '@media (prefers-reduced-motion: reduce)': { display: 'none' },
        }}
      />

      <Box
        aria-hidden
        sx={{
          width: 28,
          height: 28,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '50%',
          color: 'background.default',
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
          '& svg': { fontSize: 17 },
        }}
      >
        {icon}
      </Box>

      <Typography variant="body2" sx={{ fontWeight: 600, letterSpacing: '0.01em' }}>
        {label}
      </Typography>

      <IconButton
        size="small"
        aria-label={`Turn off ${label}`}
        onClick={onRemove}
        sx={{ width: 26, height: 26, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
      >
        <CloseRounded sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
}

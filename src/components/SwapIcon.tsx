import type { ReactNode } from 'react';
import { Box } from '@mui/material';

interface Props {
  /** Key of the icon to show. */
  active: string;
  icons: Record<string, ReactNode>;
  size?: number;
}

/** Cross-fades between icons with a small rotate and scale, so a button can change role smoothly. */
export default function SwapIcon({ active, icons, size = 24 }: Props) {
  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      {Object.entries(icons).map(([key, icon]) => {
        const on = key === active;
        return (
          <Box
            key={key}
            aria-hidden={!on}
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              opacity: on ? 1 : 0,
              transform: on ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(-60deg)',
              transition: 'opacity 180ms ease, transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          >
            {icon}
          </Box>
        );
      })}
    </Box>
  );
}

import { useState } from 'react';
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import CloseRounded from '@mui/icons-material/CloseRounded';
import MicOffRounded from '@mui/icons-material/MicOffRounded';
import MicRounded from '@mui/icons-material/MicRounded';

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LiveModeOverlay({ open, onClose }: Props) {
  const [muted, setMuted] = useState(false);

  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 4,
          bgcolor: 'background.default',
        }}
      >
        <Box />

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <Box
            sx={{
              width: 168,
              height: 168,
              borderRadius: '50%',
              background: (t) =>
                `radial-gradient(circle at 35% 30%, ${t.palette.secondary.main}, ${t.palette.primary.main} 70%)`,
              boxShadow: (t) => `0 0 80px ${alpha(t.palette.primary.main, 0.4)}`,
              animation: muted ? 'none' : `${pulse} 3s ease-in-out infinite`,
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          />
          <Typography color="text.secondary">{muted ? 'Microphone is off' : 'Listening'}</Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3 }}>
          <IconButton
            aria-label={muted ? 'Turn microphone on' : 'Turn microphone off'}
            onClick={() => setMuted((m) => !m)}
            sx={{ width: 56, height: 56, bgcolor: 'background.paper' }}
          >
            {muted ? <MicOffRounded /> : <MicRounded />}
          </IconButton>
          <IconButton
            aria-label="End live mode"
            onClick={onClose}
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.main',
              color: 'background.default',
              '&:hover': { bgcolor: 'primary.light' },
            }}
          >
            <CloseRounded />
          </IconButton>
        </Box>
      </Box>
    </Dialog>
  );
}

import { Box, SvgIcon } from '@mui/material';
import { alpha } from '@mui/material/styles';

interface Props {
  size?: number;
  /** Optional image URL. Falls back to a four-point star. */
  src?: string;
}

export default function BotAvatar({ size = 40, src }: Props) {
  const ring = Math.max(2, Math.round(size / 36));

  return (
    <Box
      sx={{
        width: size,
        height: size,
        p: `${ring}px`,
        borderRadius: '50%',
        flexShrink: 0,
        background: (t) =>
          `conic-gradient(from 210deg, ${t.palette.primary.main}, ${t.palette.secondary.main}, ${t.palette.primary.main})`,
        boxShadow: size > 80 ? (t) => `0 0 56px ${alpha(t.palette.primary.main, 0.3)}` : 'none',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          bgcolor: 'background.default',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
        }}
      >
        {src ? (
          <Box component="img" src={src} alt="Nova" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <SvgIcon viewBox="0 0 24 24" sx={{ fontSize: size * 0.45, color: 'secondary.main' }}>
            <path d="M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10Z" />
          </SvgIcon>
        )}
      </Box>
    </Box>
  );
}

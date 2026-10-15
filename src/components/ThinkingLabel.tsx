import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';

const shimmer = keyframes`
  from { background-position: 100% 0; }
  to { background-position: 0% 0; }
`;

const dotPulse = keyframes`
  0%, 80%, 100% { opacity: 0.25; }
  40% { opacity: 1; }
`;

/** "Thinking..." text with a light sweep and pulsing dots. */
export default function ThinkingLabel() {
  return (
    <Typography role="status" sx={{ color: 'text.secondary' }}>
      <Box
        component="span"
        sx={{
          background: (t) =>
            `linear-gradient(90deg, ${t.palette.text.secondary} 35%, ${t.palette.text.primary} 50%, ${t.palette.text.secondary} 65%)`,
          backgroundSize: '250% 100%',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: `${shimmer} 1.8s linear infinite`,
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            background: 'none',
            WebkitTextFillColor: 'currentColor',
          },
        }}
      >
        Thinking
      </Box>
      <Box component="span" aria-hidden sx={{ ml: '1px' }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            component="span"
            sx={{
              display: 'inline-block',
              animation: `${dotPulse} 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          >
            .
          </Box>
        ))}
      </Box>
    </Typography>
  );
}

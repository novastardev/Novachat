import { Box } from '@mui/material';
import { keyframes } from '@mui/material/styles';

const bob = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-0.5px) rotate(-5deg); }
  75% { transform: translateY(-0.5px) rotate(5deg); }
`;

const glance = keyframes`
  0%, 100% { transform: translateX(0); }
  30% { transform: translateX(-0.9px); }
  65% { transform: translateX(0.9px); }
`;

const blink = keyframes`
  0%, 88%, 100% { transform: scaleY(1); }
  92% { transform: scaleY(0.1); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.35; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
`;

interface Props {
  size?: number;
  /** Pauses the animation when false (e.g. after the avatar has switched back). */
  active?: boolean;
}

/** Little robot head that nods, looks around and blinks while the assistant is thinking. */
export default function ThinkingBot({ size = 28, active = true }: Props) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      aria-hidden
      sx={{
        width: size,
        height: size,
        display: 'block',
        overflow: 'visible',
        color: 'text.primary',
        '& .bot, & .eyes, & .eye, & .dot': {
          transformBox: 'fill-box',
          transformOrigin: 'center',
          animationPlayState: active ? 'running' : 'paused',
        },
        '& .bot': { transformOrigin: 'center bottom', animation: `${bob} 1.8s ease-in-out infinite` },
        '& .eyes': { animation: `${glance} 2.6s ease-in-out infinite` },
        '& .eye': { animation: `${blink} 3.2s ease-in-out infinite` },
        '& .dot': { animation: `${pulse} 1.2s ease-in-out infinite` },
        '@media (prefers-reduced-motion: reduce)': {
          '& .bot, & .eyes, & .eye, & .dot': { animation: 'none' },
        },
      }}
    >
      <g className="bot">
        {/* antenna */}
        <line x1="12" y1="5" x2="12" y2="7.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle className="dot" cx="12" cy="3.6" r="1.4" fill="currentColor" />
        {/* ears */}
        <rect x="2" y="11" width="2.2" height="5" rx="1.1" fill="currentColor" />
        <rect x="19.8" y="11" width="2.2" height="5" rx="1.1" fill="currentColor" />
        {/* head */}
        <rect
          x="4.5"
          y="7.2"
          width="15"
          height="12.6"
          rx="5"
          fill="currentColor"
          fillOpacity="0.1"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        {/* eyes */}
        <g className="eyes">
          <rect className="eye" x="8.3" y="11.6" width="2.2" height="4" rx="1.1" fill="currentColor" />
          <rect className="eye" x="13.5" y="11.6" width="2.2" height="4" rx="1.1" fill="currentColor" />
        </g>
      </g>
    </Box>
  );
}

import { useState } from 'react';
import { Box, Collapse, Typography } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import PsychologyOutlined from '@mui/icons-material/PsychologyOutlined';

interface Props {
  /** Raw reasoning text from the model. Plain text, not markdown. */
  reasoning: string;
  /** Starts expanded while the reply is still streaming/typing; collapses once it's done. */
  defaultOpen?: boolean;
}

/** Collapsible "thinking" trace shown above a reply, similar to Claude's extended-thinking summary. */
export default function ReasoningPanel({ reasoning, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Box sx={{ mb: 1.5, maxWidth: '100%' }}>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.5,
          border: 1,
          borderColor: 'divider',
          borderRadius: '999px',
          bgcolor: 'transparent',
          color: 'text.secondary',
          cursor: 'pointer',
          font: 'inherit',
          transition: 'border-color 150ms ease, color 150ms ease',
          '&:hover': { borderColor: 'text.secondary', color: 'text.primary' },
        }}
      >
        <PsychologyOutlined sx={{ fontSize: 16 }} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Thought process
        </Typography>
        <ExpandMoreRounded
          sx={{
            fontSize: 18,
            transition: 'transform 200ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </Box>

      <Collapse in={open} timeout={200}>
        <Typography
          component="div"
          variant="body2"
          sx={{
            mt: 1,
            pl: 1.75,
            ml: 0.75,
            borderLeft: 2,
            borderColor: 'divider',
            color: 'text.secondary',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {reasoning}
        </Typography>
      </Collapse>
    </Box>
  );
}

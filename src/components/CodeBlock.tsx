import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import SwapIcon from './SwapIcon';

export const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts (e.g. opening the dev server over a LAN address).
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  }
}

interface Props {
  language: string;
  /** Raw code, used for the copy button. */
  text: string;
  /** The already highlighted <code> element. */
  children: ReactNode;
}

export default function CodeBlock({ language, text, children }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = async () => {
    if (!(await copyText(text))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      data-atomic=""
      sx={{
        my: 2,
        borderRadius: '14px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 40,
          pl: 1.75,
          pr: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: alpha('#FFFFFF', 0.03),
        }}
      >
        <Typography variant="caption" sx={{ fontFamily: MONO_FONT, color: 'text.secondary' }}>
          {language || 'text'}
        </Typography>
        <Button
          size="small"
          color="inherit"
          aria-label="Copy code"
          onClick={handleCopy}
          startIcon={
            <SwapIcon
              size={18}
              active={copied ? 'done' : 'copy'}
              icons={{
                copy: <ContentCopyRounded sx={{ fontSize: 16 }} />,
                done: <CheckRounded sx={{ fontSize: 16 }} />,
              }}
            />
          }
          sx={{ color: 'text.secondary', minWidth: 88, '&:hover': { color: 'text.primary' } }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </Box>

      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.75,
          overflowX: 'auto',
          fontFamily: MONO_FONT,
          fontSize: '0.85rem',
          lineHeight: 1.65,
          color: '#E6E6E6',
          '& code': { fontFamily: 'inherit', fontSize: 'inherit', background: 'none', p: 0 },
          // Black and white syntax theme (highlight.js classes)
          '& .hljs-comment, & .hljs-quote': { color: '#6B6B6B', fontStyle: 'italic' },
          '& .hljs-keyword, & .hljs-selector-tag, & .hljs-literal, & .hljs-built_in, & .hljs-type': {
            color: '#FFFFFF',
            fontWeight: 700,
          },
          '& .hljs-string, & .hljs-regexp, & .hljs-addition, & .hljs-attribute, & .hljs-template-variable': {
            color: '#B5B5B5',
          },
          '& .hljs-number, & .hljs-symbol, & .hljs-bullet, & .hljs-meta': { color: '#D6D6D6' },
          '& .hljs-title, & .hljs-section, & .hljs-name': { color: '#FFFFFF', fontWeight: 600 },
          '& .hljs-params, & .hljs-variable, & .hljs-property': { color: '#CFCFCF' },
          '& .hljs-subst': { color: '#E6E6E6' },
          '& .hljs-deletion': { color: '#7A7A7A', textDecoration: 'line-through' },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

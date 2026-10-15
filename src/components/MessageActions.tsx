import { useState } from 'react';
import { IconButton, Stack, Tooltip } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import ShareOutlined from '@mui/icons-material/ShareOutlined';
import ThumbDownOutlined from '@mui/icons-material/ThumbDownOutlined';
import ThumbDownRounded from '@mui/icons-material/ThumbDownRounded';
import ThumbUpOutlined from '@mui/icons-material/ThumbUpOutlined';
import ThumbUpRounded from '@mui/icons-material/ThumbUpRounded';
import VolumeUpOutlined from '@mui/icons-material/VolumeUpOutlined';

const btnSx = {
  width: 30,
  height: 30,
  color: 'text.secondary',
  '&:hover': { color: 'text.primary' },
} as const;

interface Props {
  text: string;
  rating?: 'up' | 'down';
  /** True while this reply's audio is loading or playing; swaps the icon to a filled state. */
  speaking?: boolean;
  /** Omit to hide the regenerate button (e.g. for any reply that isn't the latest). */
  onRegenerate?: () => void;
  onRate: (rating: 'up' | 'down') => void;
  onReadAloud: () => void;
  onShare?: () => void;
}

/** Row of icon actions shown under a completed AI reply. */
export default function MessageActions({
  text,
  rating,
  speaking,
  onRegenerate,
  onRate,
  onReadAloud,
  onShare,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied or unavailable — nothing more we can do here.
    }
  };

  const share = async () => {
    if (onShare) return onShare();
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // User cancelled the share sheet — not an error.
      }
    } else {
      await copy();
    }
  };

  return (
    <Stack direction="row" spacing={0.25} sx={{ mt: 0.75 }}>
      <Tooltip title={copied ? 'Copied' : 'Copy'}>
        <IconButton size="small" aria-label="Copy" onClick={copy} sx={btnSx}>
          {copied ? <CheckRounded sx={{ fontSize: 17 }} /> : <ContentCopyOutlined sx={{ fontSize: 17 }} />}
        </IconButton>
      </Tooltip>

      {onRegenerate && (
        <Tooltip title="Regenerate">
          <IconButton size="small" aria-label="Regenerate" onClick={onRegenerate} sx={btnSx}>
            <RefreshRounded sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title={speaking ? 'Stop reading' : 'Read aloud'}>
        <IconButton
          size="small"
          aria-label={speaking ? 'Stop reading' : 'Read aloud'}
          onClick={onReadAloud}
          sx={{ ...btnSx, ...(speaking && { color: 'primary.main' }) }}
        >
          <VolumeUpOutlined sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Good response">
        <IconButton
          size="small"
          aria-label="Good response"
          onClick={() => onRate('up')}
          sx={{ ...btnSx, ...(rating === 'up' && { color: 'primary.main' }) }}
        >
          {rating === 'up' ? <ThumbUpRounded sx={{ fontSize: 17 }} /> : <ThumbUpOutlined sx={{ fontSize: 17 }} />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Bad response">
        <IconButton
          size="small"
          aria-label="Bad response"
          onClick={() => onRate('down')}
          sx={{ ...btnSx, ...(rating === 'down' && { color: 'primary.main' }) }}
        >
          {rating === 'down' ? (
            <ThumbDownRounded sx={{ fontSize: 17 }} />
          ) : (
            <ThumbDownOutlined sx={{ fontSize: 17 }} />
          )}
        </IconButton>
      </Tooltip>

      <Tooltip title="Share">
        <IconButton size="small" aria-label="Share" onClick={share} sx={btnSx}>
          <ShareOutlined sx={{ fontSize: 17 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

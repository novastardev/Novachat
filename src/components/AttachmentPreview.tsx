import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined';
import VideocamOutlined from '@mui/icons-material/VideocamOutlined';
import type { Attachment, AttachmentKind } from '../types';

const rise = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const TILE = 88;
const FILE_TILE_WIDTH = 224;

const kindIcon: Record<AttachmentKind, ReactNode> = {
  photo: <ImageOutlined sx={{ fontSize: 14 }} />,
  video: <VideocamOutlined sx={{ fontSize: 14 }} />,
  file: <InsertDriveFileOutlined sx={{ fontSize: 14 }} />,
};

const overlayChip = {
  position: 'absolute',
  top: 6,
  width: 24,
  height: 24,
  display: 'grid',
  placeItems: 'center',
  borderRadius: '50%',
  color: '#fff',
  bgcolor: 'rgba(0, 0, 0, 0.72)',
} as const;

const fillStyle = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } as const;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1, dot + 5).toUpperCase() : 'FILE';
}

function Tile({ item, onRemove }: { item: Attachment; onRemove: (id: string) => void }) {
  const isFile = item.kind === 'file';

  return (
    <Box
      role="listitem"
      sx={{
        position: 'relative',
        flexShrink: 0,
        width: isFile ? FILE_TILE_WIDTH : TILE,
        height: TILE,
        borderRadius: '16px',
        overflow: 'hidden',
        bgcolor: 'background.default',
        border: 1,
        borderColor: 'divider',
        scrollSnapAlign: 'start',
      }}
    >
      {item.kind === 'photo' && <img src={item.previewUrl} alt={item.file.name} style={fillStyle} />}

      {item.kind === 'video' && (
        <video
          src={item.previewUrl ? `${item.previewUrl}#t=0.1` : undefined}
          aria-label={item.file.name}
          muted
          playsInline
          preload="metadata"
          style={fillStyle}
        />
      )}

      {isFile && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, height: '100%', pl: 1.25, pr: 4.5 }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '12px',
              bgcolor: 'background.paper',
              color: 'primary.main',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            {extensionOf(item.file.name)}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {item.file.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatSize(item.file.size)}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Top-left: remove */}
      <IconButton
        size="small"
        aria-label={`Remove ${item.file.name}`}
        onClick={() => onRemove(item.id)}
        sx={{ ...overlayChip, left: 6, p: 0, '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.92)' } }}
      >
        <CloseRounded sx={{ fontSize: 14 }} />
      </IconButton>

      {/* Top-right: type icon */}
      <Box aria-hidden sx={{ ...overlayChip, right: 6, pointerEvents: 'none' }}>
        {kindIcon[item.kind]}
      </Box>
    </Box>
  );
}

interface Props {
  items: Attachment[];
  onRemove: (id: string) => void;
}

/** Floating pill above the input bar. Scrolls sideways when attachments overflow the screen. */
export default function AttachmentPreview({ items, onRemove }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  // Bring a newly added attachment into view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && items.length > prevCount.current) {
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    }
    prevCount.current = items.length;
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <Box
      ref={scrollRef}
      role="list"
      aria-label="Attachments"
      sx={{
        display: 'flex',
        gap: 1,
        p: 1,
        mb: 0.75,
        width: 'fit-content',
        maxWidth: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        overscrollBehaviorX: 'contain',
        scrollSnapType: 'x proximity',
        scrollPaddingLeft: 8,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        borderRadius: '26px',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
        animation: `${rise} 220ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {items.map((item) => (
        <Tile key={item.id} item={item} onRemove={onRemove} />
      ))}
    </Box>
  );
}

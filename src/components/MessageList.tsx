import { useEffect, useRef } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import BotAvatar from './BotAvatar';
import type { ChatMessage } from '../types';

export default function MessageList({ messages }: { messages: ChatMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  return (
    <Stack spacing={2.5} sx={{ width: '100%', maxWidth: 760, mx: 'auto', px: 2, py: 2 }}>
      {messages.map((message) =>
        message.role === 'user' ? (
          <Box
            key={message.id}
            sx={{
              alignSelf: 'flex-end',
              maxWidth: '85%',
              px: 2,
              py: 1.25,
              borderRadius: '20px 20px 6px 20px',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.2),
            }}
          >
            {message.attachments && message.attachments.length > 0 && (
              <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mb: message.text ? 1 : 0 }}>
                {message.attachments.map((name, i) => (
                  <Chip key={`${name}-${i}`} size="small" label={name} sx={{ maxWidth: 200 }} />
                ))}
              </Stack>
            )}
            {message.text && (
              <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.text}</Typography>
            )}
          </Box>
        ) : (
          <Stack key={message.id} direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ pt: 0.25 }}>
              <BotAvatar size={28} />
            </Box>
            <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minWidth: 0 }}>
              {message.text}
            </Typography>
          </Stack>
        ),
      )}
      <div ref={endRef} />
    </Stack>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import AssistantAvatar from './AssistantAvatar';
import MarkdownMessage from './MarkdownMessage';
import MessageActions from './MessageActions';
import ReasoningPanel from './ReasoningPanel';
import ThinkingLabel from './ThinkingLabel';
import VoicePlaybackBar from './VoicePlaybackBar';
import { VoiceError, synthesizeSpeech } from '../lib/voice';
import type { ChatMessage } from '../types';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`;

interface Props {
  messages: ChatMessage[];
  onRegenerate: (messageId: string) => void;
  onRate: (messageId: string, rating: 'up' | 'down') => void;
}

export default function MessageList({ messages, onRegenerate, onRate }: Props) {
  // Only the most recent assistant reply can be regenerated — older ones would need
  // context (later turns) that no longer matches if the conversation moved on.
  let lastAssistantId: string | undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantId = messages[i].id;
      break;
    }
  }

  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const smoothUntil = useRef(0);
  const [debugInfo, setDebugInfo] = useState('');

  // Which message's "Read aloud" is active, and that audio's state. Only one plays
  // at a time; starting another replaces this. The object URL is revoked on cleanup.
  const [voice, setVoice] = useState<
    { messageId: string; src?: string; loading: boolean; error?: string } | null
  >(null);
  const voiceSrcRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    voiceSrcRef.current = voice?.src;
  }, [voice?.src]);

  // Revoke the last object URL on unmount, so a page navigation doesn't leak it.
  useEffect(
    () => () => {
      if (voiceSrcRef.current) URL.revokeObjectURL(voiceSrcRef.current);
    },
    [],
  );

  const closeVoice = () => {
    if (voice?.src) URL.revokeObjectURL(voice.src);
    setVoice(null);
  };

  const readAloud = async (message: ChatMessage) => {
    // Clicking the speaker on a message that's already showing a FINISHED error closes
    // it; clicking while it's still loading does nothing (avoids starting a second job).
    if (voice?.messageId === message.id) {
      if (voice.loading) return;
      closeVoice();
      return;
    }
    if (voice?.src) URL.revokeObjectURL(voice.src);
    setVoice({ messageId: message.id, loading: true });

    try {
      const src = await synthesizeSpeech(message.text, { voice: 'matthew' });
      setVoice((current) =>
        current?.messageId === message.id ? { messageId: message.id, src, loading: false } : current,
      );
    } catch (err) {
      const errorMessage = err instanceof VoiceError ? err.message : 'Could not generate audio.';
      console.error(errorMessage);
      setVoice((current) =>
        current?.messageId === message.id ? { messageId: message.id, loading: false, error: errorMessage } : current,
      );
    }
  };

  // Scroll only the chat area (not the whole page), so nothing outside it can shift.
  const getScroller = () => endRef.current?.closest('main') ?? null;

  useEffect(() => {
    const el = getScroller();
    if (!el) return;
    const onScroll = () => {
      if (performance.now() < smoothUntil.current) return; // ignore our own smooth scroll
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // A new message scrolls to the bottom with a smooth animation.
  useEffect(() => {
    const el = getScroller();
    if (!el) return;
    pinned.current = true;
    smoothUntil.current = performance.now() + 800;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    // If the content grew while animating, finish the last bit.
    const timer = window.setTimeout(() => {
      if (pinned.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 850);
    return () => window.clearTimeout(timer);
  }, [messages]);

  // Content that grows later (diagrams, images) keeps you at the bottom only if you were already there.
  useEffect(() => {
    const list = listRef.current;
    const el = getScroller();
    if (!list || !el) return;
    const observer = new ResizeObserver(() => {
      if (!pinned.current || performance.now() < smoothUntil.current) return;
      el.scrollTop = el.scrollHeight;
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  // Open the app with ?debug to see what is making the chat area taller than its content.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    const timer = window.setTimeout(() => {
      const el = getScroller();
      if (!el) return;
      const origin = el.getBoundingClientRect().top - el.scrollTop;
      const rows = Array.from(el.querySelectorAll('*'))
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const cls = typeof node.className === 'string' ? node.className.split(' ')[0] : '';
          return {
            name: node.tagName.toLowerCase() + (cls ? `.${cls}` : ''),
            bottom: Math.round(rect.bottom - origin),
            height: Math.round(rect.height),
            position: getComputedStyle(node).position,
          };
        })
        .sort((a, b) => b.bottom - a.bottom)
        .slice(0, 8);
      setDebugInfo(
        `scrollHeight ${el.scrollHeight} / clientHeight ${el.clientHeight}\n` +
          rows.map((r) => `${r.bottom}  h${r.height}  ${r.position}  ${r.name}`).join('\n'),
      );
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [messages]);

  return (
    <Box
      ref={listRef}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%', maxWidth: 760, mx: 'auto', px: 2, py: 2, overflow: 'clip' }}
    >
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
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.75, flexWrap: 'wrap', mb: message.text ? 1 : 0 }}>
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
          <Box key={message.id} sx={{ display: 'flex', flexDirection: 'row', gap: 1.5, alignItems: 'flex-start' }}>
            <Box sx={{ pt: 0.25 }}>
              <AssistantAvatar thinking={Boolean(message.thinking)} />
            </Box>
            {message.thinking ? (
              <ThinkingLabel />
            ) : (
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  animation: `${fadeIn} 300ms ease-out`,
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  ...(message.error && { color: 'error.light' }),
                }}
              >
                {message.error ? (
                  <Typography color="error.light">{message.text}</Typography>
                ) : (
                  <>
                    {message.reasoning && <ReasoningPanel reasoning={message.reasoning} />}
                    <MarkdownMessage text={message.text} messageId={message.id} animate={message.animate} />
                    {voice?.messageId === message.id && (
                      <Box sx={{ mt: 1 }}>
                        <VoicePlaybackBar
                          src={voice.src}
                          loading={voice.loading}
                          error={voice.error}
                          onClose={closeVoice}
                        />
                      </Box>
                    )}
                    <MessageActions
                      text={message.text}
                      rating={message.rating}
                      speaking={voice?.messageId === message.id}
                      onRegenerate={
                        message.id === lastAssistantId ? () => onRegenerate(message.id) : undefined
                      }
                      onRate={(rating) => onRate(message.id, rating)}
                      onReadAloud={() => readAloud(message)}
                    />
                  </>
                )}
              </Box>
            )}
          </Box>
        ),
      )}
      <div ref={endRef} />
      {debugInfo && (
        <Box
          component="pre"
          sx={{
            position: 'fixed',
            top: 64,
            left: 8,
            right: 8,
            zIndex: 2000,
            m: 0,
            p: 1,
            fontSize: 10,
            lineHeight: 1.4,
            color: '#7CFF7C',
            bgcolor: 'rgba(0, 0, 0, 0.92)',
            border: '1px solid #7CFF7C',
            whiteSpace: 'pre-wrap',
            pointerEvents: 'none',
          }}
        >
          {debugInfo}
        </Box>
      )}
    </Box>
  );
}

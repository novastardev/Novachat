import { useCallback, useRef, useState } from 'react';
import { Box } from '@mui/material';
import TopBar from './components/TopBar';
import WelcomeScreen from './components/WelcomeScreen';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import SideDrawer from './components/SideDrawer';
import LiveModeOverlay from './components/LiveModeOverlay';
import { connectNovaStack, NovaStackError, SYSTEM_PROMPT, sendChatMessage } from './lib/novastack';
import type { NovaStackMessage } from './lib/novastack';
import type { ChatMessage, SendPayload } from './types';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  // Keeps the conversation history to send as context with each request.
  const historyRef = useRef<NovaStackMessage[]>([{ role: 'system', content: SYSTEM_PROMPT }]);

  // Sends `history` to the API and writes the result into the message with id `replyId`.
  // Shared by both a fresh send and a regenerate, which differ only in how they got here.
  const requestReply = useCallback(
    (replyId: string, history: NovaStackMessage[], thinkHarder: boolean) => {
      sendChatMessage(history, { thinkHarder })
        .then(({ text, reasoning }) => {
          historyRef.current = [...history, { role: 'assistant', content: text }];
          setMessages((prev) =>
            prev.map((m) =>
              m.id === replyId
                ? { ...m, text, reasoning, thinking: false, animate: true, error: false, thinkHarder }
                : m,
            ),
          );
        })
        .catch((err: unknown) => {
          const message =
            err instanceof NovaStackError ? err.message : 'Something went wrong. Please try again.';
          setMessages((prev) =>
            prev.map((m) => (m.id === replyId ? { ...m, text: message, thinking: false, error: true } : m)),
          );
        });
    },
    [],
  );

  const handleSend = useCallback(
    ({ text, options, attachments }: SendPayload) => {
      const replyId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'user',
          text,
          attachments: attachments.map((file) => file.name),
        },
        { id: replyId, role: 'assistant', text: '', thinking: true },
      ]);

      const history = [...historyRef.current, { role: 'user' as const, content: text }];
      historyRef.current = history;
      // TODO: attachments aren't sent to the API yet — the chat models used here don't
      // accept images/files.

      requestReply(replyId, history, options.thinkHarder);
    },
    [requestReply],
  );

  // Re-runs the request that produced `replyId`, using the same model it used the first
  // time and the conversation history up to (but not including) that reply.
  const handleRegenerate = useCallback(
    (replyId: string) => {
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === replyId);
        if (index === -1) return prev;

        const target = prev[index];
        // Walk backwards to find the user message this reply was responding to.
        const userText = [...prev.slice(0, index)].reverse().find((m) => m.role === 'user')?.text;
        if (userText === undefined) return prev;

        // historyRef.current currently ends with [..., that user turn, the OLD assistant
        // reply]. Drop both and re-append the user turn fresh, so it isn't duplicated.
        // (Regenerating anything other than the most recent exchange is intentionally not
        // supported, since later turns would reference context that no longer matches.)
        const history = [...historyRef.current.slice(0, -2), { role: 'user' as const, content: userText }];
        requestReply(replyId, history, Boolean(target.thinkHarder));

        return prev.map((m) => (m.id === replyId ? { ...m, thinking: true, error: false } : m));
      });
    },
    [requestReply],
  );

  const handleRate = useCallback((messageId: string, rating: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, rating: m.rating === rating ? undefined : rating } : m)),
    );
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <Box
      sx={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <TopBar
        title={hasMessages ? 'Nova' : undefined}
        onOpenDrawer={() => setDrawerOpen(true)}
        onNewChat={() => {
          setMessages([]);
          historyRef.current = [{ role: 'system', content: SYSTEM_PROMPT }];
        }}
        onConnectNovaStack={connectNovaStack}
      />

      <Box
        component="main"
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        {hasMessages ? (
          <MessageList messages={messages} onRegenerate={handleRegenerate} onRate={handleRate} />
        ) : (
          <WelcomeScreen />
        )}
      </Box>

      <ChatInput onSend={handleSend} onLiveMode={() => setLiveOpen(true)} />

      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <LiveModeOverlay open={liveOpen} onClose={() => setLiveOpen(false)} />
    </Box>
  );
}

import { useCallback, useState } from 'react';
import { Box } from '@mui/material';
import TopBar from './components/TopBar';
import WelcomeScreen from './components/WelcomeScreen';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import SideDrawer from './components/SideDrawer';
import LiveModeOverlay from './components/LiveModeOverlay';
import type { ChatMessage, SendPayload } from './types';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);

  const handleSend = useCallback(({ text, attachments }: SendPayload) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        text,
        attachments: attachments.map((file) => file.name),
      },
    ]);

    // TODO: replace this placeholder with your real chatbot API call.
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'Placeholder reply. Connect your chatbot API in App.tsx.',
        },
      ]);
    }, 600);
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
        onNewChat={() => setMessages([])}
      />

      <Box
        component="main"
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        {hasMessages ? <MessageList messages={messages} /> : <WelcomeScreen />}
      </Box>

      <ChatInput onSend={handleSend} onLiveMode={() => setLiveOpen(true)} />

      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <LiveModeOverlay open={liveOpen} onClose={() => setLiveOpen(false)} />
    </Box>
  );
}

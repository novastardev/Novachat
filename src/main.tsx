import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import '@fontsource-variable/sora';
import App from './App';
import OAuthCallback from './components/OAuthCallback';
import theme from './theme';

const Root = window.location.pathname === '/oauth/callback' ? OAuthCallback : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Root />
    </ThemeProvider>
  </StrictMode>,
);

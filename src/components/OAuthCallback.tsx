import { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { finishNovaStackLogin } from '../lib/novastack-oauth';

export default function OAuthCallback() {
  const [status, setStatus] = useState('Completing NovaStack sign-in…');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    finishNovaStackLogin()
      .then((user) => {
        if (active) setStatus(user.name ? `Signed in as ${user.name}` : user.email ? `Signed in as ${user.email}` : 'NovaStack sign-in completed.');
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Sign-in failed.');
          setStatus('Could not sign in');
        }
      });
    return () => { active = false; };
  }, []);

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 2, p: 3, textAlign: 'center' }}>
      {!error && <CircularProgress size={28} />}
      <Typography variant="h5">{status}</Typography>
      {error && <Typography color="error" role="alert">{error}</Typography>}
      {error && <Button onClick={() => { window.location.href = '/'; }}>Back to Nova</Button>}
      {!error && <Typography color="text.secondary" variant="body2">You can return to NovaChat when this finishes.</Typography>}
    </Box>
  );
}

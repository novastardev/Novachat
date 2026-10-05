import { Box, Typography } from '@mui/material';
import BotAvatar from './BotAvatar';

export default function WelcomeScreen() {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        px: 3,
        pb: 6,
        textAlign: 'center',
      }}
    >
      {/* Set src to your bot's profile picture, e.g. src="/nova.png" */}
      <BotAvatar size={112} />
      <Box>
        <Typography component="h1" variant="h3">
          Nova
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: '30ch', mx: 'auto' }}>
          Ask a question, or tap + to add a photo or file.
        </Typography>
      </Box>
    </Box>
  );
}

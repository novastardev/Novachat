import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#8EA2FF' },
    secondary: { main: '#FFC785' },
    background: { default: '#0F1224', paper: '#181C36' },
    text: { primary: '#E8EAF6', secondary: '#9AA0C3' },
    divider: 'rgba(160, 170, 230, 0.16)',
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Sora Variable", "Segoe UI", system-ui, sans-serif',
    h3: { fontSize: '2.5rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 },
    body1: { lineHeight: 1.65 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        'html, body, #root': { height: '100%' },
        body: { overscrollBehavior: 'none' },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 16, border: '1px solid rgba(160, 170, 230, 0.16)' },
      },
    },
  },
});

export default theme;

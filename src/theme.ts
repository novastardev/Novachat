import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#FFFFFF', light: '#D6D6D6', dark: '#B8B8B8', contrastText: '#000000' },
    secondary: { main: '#A6A6A6', contrastText: '#000000' },
    background: { default: '#000000', paper: '#111111' },
    text: { primary: '#F2F2F2', secondary: '#8F8F8F' },
    divider: 'rgba(255, 255, 255, 0.14)',
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
        paper: { borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.14)' },
      },
    },
  },
});

export default theme;

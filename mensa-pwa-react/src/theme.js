import { createTheme } from '@mui/material/styles';
import '@fontsource-variable/jost';

// A custom theme for this app
const theme = createTheme({
  typography: {
    fontFamily: 'Jost Variable',
  },
  palette: {
    primary: {
      light: '#828aba',
      main: '#424688',
      dark: '#2e2b64',
      contrastText: '#fff',
    },
    secondary: {
      main: '#426988',
    },
    background: {
      default: '#f9faff',
      paper: '#fff',
    },
  },
});

export default theme;


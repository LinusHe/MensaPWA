import { createTheme } from '@mui/material/styles';
import '@fontsource-variable/jost';

// A custom theme for this app
const theme = createTheme({
  spacing: 8,
  typography: {
    fontFamily: 'Jost Variable',
    screenHeading: {
      variant: "h1",
      fontWeight: "bold",
      fontSize: "3rem",
    },
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
  components: {
    MuiTypography: {
      styleOverrides: {
        screenHeading: {
          paddingBottom: '0.5rem', // Specify the desired padding value, e.g., 'pb3'
        },
      },
      defaultProps: {
        variantMapping: {
          // Map the new variant to render a <h1> by default
          screenHeading: 'h1',
        },
      },
    },
  },
});

export default theme;


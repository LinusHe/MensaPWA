import { createTheme } from '@mui/material/styles';
import '@fontsource-variable/jost';

const getDesignTokens = (mode) => ({
  spacing: 8,
  typography: {
    fontFamily: 'Jost Variable',
    screenHeading: {
      variant: "h1",
      fontWeight: "bold",
      fontSize: "3rem",
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
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // palette values for light mode
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
            dishcard: '#ffffff',
            priceChip: '#F2F4FF'
          },
          shadow: {
            main: '#42468810',
          },
          food: {
            fishSeafood: '#3F51B5',
            vegetarian: '#8BC34A',
            pork: '#F44336',
            vegan: '#4CAF50',
            chicken: '#FF9800',
            bio: '#00897B',
            alcohol: '#E91E63',
            default: '#5E35B1',
          },
        }
      : {
          // palette values for dark mode
          primary: {
            light: '#828aba',
            main: '#828aba',
            dark: '#2e2b64',
            contrastText: '#fff',
          },
          secondary: {
            main: '#426988',
          },
          background: {
            default: '#121212',
            paper: '#121212',
            dishcard: '#1c1c1c',
            priceChip: '#434448'
          },
          shadow: {
            main: '#ffffff05',
          },
          food: {
            fishSeafood: '#3F51B5',
            vegetarian: '#8BC34A',
            pork: '#F44336',
            vegan: '#4CAF50',
            chicken: '#FF9800',
            bio: '#00897B',
            alcohol: '#E91E63',
            default: '#5E35B1',
          },
        }),
  },
});

const theme = (mode) => createTheme(getDesignTokens(mode));

export default theme;

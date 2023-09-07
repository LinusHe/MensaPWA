// react imports
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client';
import { Provider, useSelector } from 'react-redux';
import { store } from './store';
import { BrowserRouter } from 'react-router-dom';

// mui imports
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// PWA imports
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

// file imports
import App from './App';
import theme from './theme';

// font imports
import '@fontsource-variable/jost';
import '@fontsource/roboto';


const Root = () => {
  const [bottomPadding, setBottomPadding] = useState(0);
  const navBarHeight = useSelector(state => state.navBarHeight);

  useEffect(() => {
    setBottomPadding(navBarHeight);
  }, [navBarHeight]);

  return (
    <React.StrictMode >
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div style={{ '--navBarHeight': 'calc(env(safe-area-inset-bottom) + ' + bottomPadding + 'px)' }}>
            <App />
          </div>
        </ThemeProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <Root />
  </Provider>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
// react imports
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client';
import { Provider, useSelector } from 'react-redux';
import { store } from './store';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// mui imports
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';

// PWA imports
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

// file imports
import App from './App';
import theme from './theme';

// font imports
import '@fontsource-variable/jost';
import '@fontsource/roboto';

// Initialize firebase project
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD5aT5GwndtWGX8wJ4izKUIoW7zixOvydk",
  authDomain: "mensapwa-39cd9.firebaseapp.com",
  projectId: "mensapwa-39cd9",
  storageBucket: "mensapwa-39cd9.appspot.com",
  messagingSenderId: "501729068545",
  appId: "1:501729068545:web:e8f6c4cb184c83ea40a200",
  measurementId: "G-E66SGZFP9C"
};
const firebaseApp = initializeApp(firebaseConfig);
getAnalytics(firebaseApp);


const Root = () => {
  const appearance = useSelector(state => state.appearance);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [bottomPadding, setBottomPadding] = useState(0);
  const navBarHeight = useSelector(state => state.navBarHeight);

  useEffect(() => {
    setBottomPadding(navBarHeight);
  }, [navBarHeight]);

  const themeMode = appearance === 'system' ? (prefersDarkMode ? 'dark' : 'light') : appearance;

  return (
    <React.StrictMode >
      <BrowserRouter>
        <HelmetProvider>
          <ThemeProvider theme={theme(themeMode)}>
            <CssBaseline />
            <div style={{ '--navBarHeight': 'calc(env(safe-area-inset-bottom) + ' + bottomPadding + 'px)' }} className={theme(themeMode).palette.mode === 'dark' ? 'dark-mode' : 'light-mode'}>
              <App />
            </div>
          </ThemeProvider>
        </HelmetProvider>
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
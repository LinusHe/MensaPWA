import React, { useState } from 'react'
import { Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useSnackbar } from 'notistack';

function Settings() {
  const { enqueueSnackbar } = useSnackbar();
  const [isSubscribed, setIsSubscribed] = useState(false);

  const subscribeToPush = async () => {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      enqueueSnackbar('Permission not granted for Notification', { variant: 'error' });
      return;
    }

    const sw = await navigator.serviceWorker.ready;
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    console.log(vapidPublicKey);
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    const subscription = await sw.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    const response = await fetch('http://localhost:4000/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: {
        'content-type': 'application/json'
      }
    });

    if (response.ok) {
      setIsSubscribed(true);
      enqueueSnackbar('Subscribed successfully', { variant: 'success' });
    } else {
      enqueueSnackbar('Subscription failed', { variant: 'error' });
    }
  };

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
  
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
  
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  return (
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="flex-start"
      rowSpacing={0}
      columnSpacing={0}
      sx={{ p: 2 }}
    >
      <Grid item xs={12}>
        <Typography variant="screenHeading">
          Einstellungen
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="p" fontWeight="light">
          Settings comes here
        </Typography>
        <Button variant="contained" onClick={subscribeToPush}>
          Subscribe to Notifications
        </Button>
        {isSubscribed && <Typography variant="p" fontWeight="light">
          You are subscribed to notifications
        </Typography>}
        <button onClick={() => enqueueSnackbar('That was easy!')}>Show snackbar</button>
      </Grid>
    </Grid>
  )
}

export default Settings


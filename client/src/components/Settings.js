import React from 'react'
import { Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useSnackbar } from 'notistack';
import packageJson from '../../package.json';

function Settings() {
  const { enqueueSnackbar } = useSnackbar();
  const version = packageJson.version;

  const updateCache = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.unregister().then((boolean) => {
          if (boolean) {
            console.log("Service worker unregistered.");
            enqueueSnackbar('Cache erfolgreich aktualisiert. App wird neu geladen...', { variant: 'success' });
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            console.log("Service worker not found.");
          }
        });
      }).catch((error) => {
        enqueueSnackbar(`Ein Fehler ist aufgetreten: ${error.message}`, { variant: 'error' });
      });
    } else {
      enqueueSnackbar('Service Worker ist nicht verfügbar', { variant: 'error' });
    }
  };

  return (
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="flex-start"
      rowSpacing={0}
      columnSpacing={0}
      sx={{ p: 2, width: '100%', maxWidth: '720px', mx: 'auto' }}
    >
      <Grid item xs={12}>
        <Typography variant="screenHeading">
          Einstellungen
        </Typography>
      </Grid>
      <Grid item xs={12} sx={{ mb: 3 }}>
        <Typography variant="p" fontWeight="regular" textTransform="uppercase">
          Einstellungen der Mensa App
        </Typography>
      </Grid>
      {/* <Button variant="contained" onClick={subscribeToPush}>
        Subscribe to Notifications
      </Button> */}

      <Grid item xs={12} textAlign={"left"} sx={{ pt: 2, display: 'flex', flexDirection: 'row', justifyContent: 'left', alignItems: 'center' }}>
        <Typography variant="p" fontWeight="300" sx={{ pr: 1 }}>
          App Version: {version}
        </Typography>
        <Typography fontWeight="400">
          |
        </Typography>
        <Button variant="text" style={{ color: 'rgba(0, 0, 0, 0.87)', fontWeight: '400' }} onClick={updateCache}>
          Update Cache
        </Button>
      </Grid>
    </Grid >
  )
}

export default Settings

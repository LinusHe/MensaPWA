import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Divider, Grid, Typography, Button, Select, Switch, MenuItem, ToggleButtonGroup, ToggleButton, TextField } from '@mui/material';
import { useSnackbar, closeSnackbar } from 'notistack';
import packageJson from '../../package.json';
import { useTheme } from '@mui/material/styles';
import InstallInstructions from './InstallInstructions';

// Notification Stuff
import { requestPermissionAndToken } from '../utils/pushNotification';


function Settings() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const token = useSelector(state => state.token);
  const selectedPriceType = useSelector(state => state.selectedPriceType);
  const notificationsEnabled = useSelector(state => state.notificationsEnabled);
  // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  const selectedDays = useSelector(state => state.selectedDays);
  const notificationTime = useSelector(state => state.notificationTime);

  const appearance = useSelector(state => state.appearance);
  const veganFirst = useSelector(state => state.veganFirst);
  const version = packageJson.version;

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installButtonDisplay, setInstallButtonDisplay] = useState('none');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if the app is not installed and it's an iOS device
    if (!window.navigator.standalone && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
      setInstallButtonDisplay('block');
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallButtonDisplay('block');
    });

    window.addEventListener('appinstalled', () => {
      setInstallButtonDisplay('none');
    });
  }, []);

  const installApp = async () => {

    if (!window.navigator.standalone && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // alert('To install the app on your iOS device, tap on the share button and then "Add to Home Screen".');
      setOpen(true);
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setDeferredPrompt(null);
      setInstallButtonDisplay('none');
    }
  };

  const handlePriceTypeChange = (event) => {
    dispatch({ type: 'SET_PRICE_TYPE', payload: event.target.value });
  };

  const handleNotificationsToggle = (event) => {
    if (event.target.checked) {
      if (token === null) {
        requestPermissionAndToken()
          .then((token) => {
            dispatch({ type: 'SET_TOKEN', payload: token });
            dispatch({ type: 'SET_NOTIFICATIONS_ENABLED', payload: true });
            enqueueSnackbar('Benachrichtigungen aktiviert', { variant: 'success' });
          })
          .catch((error) => {
            if (error.buttonAction) {
              const action = (key) => (
                <>
                  <Button variant="text" sx={{ color: 'background.paper' }} onClick={() => handleSnackbarButtonClick(error.buttonAction, key)}>
                    {error.buttonText}
                  </Button>
                  <Button variant="text" sx={{ color: 'background.paper' }} onClick={() => closeSnackbar()}>
                    Schließen
                  </Button>
                </>
              );
              enqueueSnackbar(error.message, { variant: error.type, action });
            }
            else enqueueSnackbar(error.message, { variant: error.type });
            dispatch({ type: 'SET_NOTIFICATIONS_ENABLED', payload: false });
          });
      } else {
        dispatch({ type: 'SET_NOTIFICATIONS_ENABLED', payload: true });
        enqueueSnackbar('Benachrichtigungen aktiviert', { variant: 'success' });
      }
    } else {
      dispatch({ type: 'SET_NOTIFICATIONS_ENABLED', payload: false });
    }
  };

  function handleSnackbarButtonClick(action, key) {
    if (action === "installPWA") {
      setOpen(true);
    } else if (action === "contactUs") {
      // Code to contact us...
    }
    closeSnackbar(key);
  }

  const handleDaysChange = async (event, newDays) => {
    dispatch({ type: 'SET_SELECTED_DAYS', payload: newDays });
  };

  const handleTimeChange = async (event) => {
    console.log("changed", event.target.value)
    console.log("timestamp", timeToTimeStamp(event.target.value))
    dispatch({ type: 'SET_NOTIFICATION_TIME', payload: event.target.value });
  };

  const handleVeganFirstChange = (event) => {
    dispatch({ type: 'SET_VEGAN_FIRST', payload: event.target.checked });
  };

  const handleAppearance = (event) => {
    dispatch({ type: 'SET_APPEARANCE', payload: event.target.value });
  };

  const updateCache = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.unregister().then((boolean) => {
          if (boolean) {
            enqueueSnackbar('Cache erfolgreich aktualisiert. App wird neu geladen...', { variant: 'success' });
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            // console.log("Service worker not found.");
          }
        });
      }).catch((error) => {
        enqueueSnackbar(`Ein Fehler ist aufgetreten: ${error.message}`, { variant: 'error' });
      });
    } else {
      enqueueSnackbar('Service Worker ist nicht verfügbar', { variant: 'error' });
    }
  };

  const timeToTimeStamp = (timeStr) => {
    const date = new Date();
    const hours = parseInt(timeStr.split(':')[0]);
    const minutes = parseInt(timeStr.split(':')[1]);
    date.setHours(hours);
    date.setMinutes(minutes);
    return date.getTime();
  }


  return (
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="flex-start"
      alignContent="flex-start"
      rowSpacing={0}
      columnSpacing={0}
      className='fullHeight'
      sx={{ overflow: 'hidden', width: '100%', maxWidth: '720px', mx: 'auto' }}
    >
      <Grid item xs={12} sx={{ p: 2 }}>
        <Grid item xs={12}>
          <Typography variant="screenHeading">
            Einstellungen
          </Typography>
        </Grid>
        <Grid item xs={12} sx={{ mb: 1 }}>
          <Typography variant="p" fontWeight="regular" textTransform="uppercase">
            Einstellungen der Mensa App
          </Typography>
        </Grid>
      </Grid>

      <InstallInstructions open={open} onDismiss={() => setOpen(false)} />

      <Grid item xs={12} sx={{ overflow: 'auto', px: 2, maxHeight: 'calc(100vh - 144px)' }}>
        <div style={{ display: installButtonDisplay }}>
          <Grid item xs={12} textAlign={"left"}>
            <Grid container direction="row" alignItems="center" justifyContent={'space-between'} flexWrap={'nowrap'}>
              <Grid item>
                <Grid container direction="column" alignItems="left">
                  <Grid item>

                  </Grid>
                  <Grid item>
                    <Typography variant="h6" fontWeight="bold" sx={{ pt: 1 }}>
                      Als App installieren
                    </Typography>
                    <Typography variant="body1" sx={{ pb: 1 }}>
                      Mensa Mate deinem Homescree hinzufügen
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={installApp}
                >
                  Installieren
                </Button>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12} sx={{ my: 2 }}>
            <Divider />
          </Grid>
        </div>

        <Grid item xs={12} textAlign={"left"}>
          <Grid container direction="row" justifyContent="center" alignItems="center">
            <Grid item xs={6}>
              <Grid container direction="column" alignItems="left">
                <Grid item>
                  <Typography variant="h6" fontWeight="bold" sx={{ pt: 1 }}>
                    Preiskategorie
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography variant="body1" sx={{ pb: 1 }}>
                    für Mensa Gerichte
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={6}>
              <Grid container justifyContent="flex-end">
                <Select value={selectedPriceType} onChange={handlePriceTypeChange}>
                  <MenuItem value="student">Studierende</MenuItem>
                  <MenuItem value="employee">Angestellte</MenuItem>
                  <MenuItem value="guest">Besucher</MenuItem>
                </Select>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} sx={{ my: 2 }}>
          <Divider />
        </Grid>

        <Grid item xs={12} textAlign={"left"}>
          <Grid container direction="row" alignItems="center" justifyContent={'space-between'} flexWrap={'nowrap'}>
            <Grid item>
              <Grid container direction="column" alignItems="left">
                <Grid item>
                  <Typography variant="h6" fontWeight="bold" sx={{ pt: 1 }}>
                    Benachrichtigungen
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography variant="body1" sx={{ pb: 1 }}>
                    Aktiviere eine witzige Notification, die dich über den heutigen Speiseplan benachrichtigt
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid item justifyContent="flex-end" sx={{ pl: 2 }}>
              <Switch checked={notificationsEnabled} onChange={handleNotificationsToggle} />
            </Grid>
          </Grid>

          {notificationsEnabled && (
            <Grid item>
              <Grid item>
                <Typography variant="body1" fontStyle="italic">
                  Wann möchtest du benachrichtigt werden?
                </Typography>
                <Grid item>
                  <Grid container direction="row" alignItems="center" justifyContent="left" >
                    <Grid item>
                      <ToggleButtonGroup value={selectedDays} onChange={handleDaysChange} sx={{ pr: 2, mt: 1 }}>
                        <ToggleButton value="1" color="primary">Mo</ToggleButton>
                        <ToggleButton value="2" color="primary">Di</ToggleButton>
                        <ToggleButton value="3" color="primary">Mi</ToggleButton>
                        <ToggleButton value="4" color="primary">Do</ToggleButton>
                        <ToggleButton value="5" color="primary">Fr</ToggleButton>
                      </ToggleButtonGroup>
                    </Grid>
                    <Grid item>
                      <TextField
                        sx={{ pt: 1 }}
                        id="time"
                        type="time"
                        InputLabelProps={{
                          shrink: true,
                        }}
                        onChange={handleTimeChange}
                        value={notificationTime}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}
        </Grid>

        <Grid item xs={12} sx={{ my: 2 }}>
          <Divider />
        </Grid>

        <Grid item xs={12} textAlign={"left"} >
          <Grid container direction="row" alignItems="center" justifyContent="space-between">
            <Grid item >
              <Grid container direction="column" alignItems="left">
                <Grid item>
                  <Typography variant="h6" fontWeight="bold" sx={{ pt: 1 }}>
                    Erscheinungsbild
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography variant="body1" sx={{ pb: 1 }}>
                    App Farbgebung anpassen
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid item >
              <Grid container justifyContent="flex-end">
                <Select value={appearance} onChange={handleAppearance}>
                  <MenuItem value="light">Heller Modus</MenuItem>
                  <MenuItem value="dark">Dunkler Modus</MenuItem>
                  <MenuItem value="system">Systemstandard</MenuItem>
                </Select>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} sx={{ my: 2 }}>
          <Divider />
        </Grid>

        <Grid item xs={12} textAlign={"left"}>
          <Grid container direction="row" alignItems="center" justifyContent={'space-between'} flexWrap={'nowrap'}>
            <Grid item>
              <Grid container direction="column" alignItems="left">
                <Grid item>
                  <Typography variant="h6" fontWeight="bold" sx={{ pt: 1 }}>
                    Veggie zuerst
                  </Typography>
                  <Typography variant="body1" sx={{ pb: 1 }}>
                    Vegetarische und vegane Gerichte im Speiseplan zuerst anzeigen
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid item>
              <Switch
                checked={veganFirst}
                onChange={handleVeganFirstChange}
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} sx={{ my: 2 }}>
          <Divider />
        </Grid>

        <Grid item xs={12} textAlign={"left"}>
          <Grid container direction="row" alignItems="center" justifyContent={'space-between'} flexWrap={'nowrap'}>
            <Grid item>
              <Grid container direction="column" alignItems="left">
                <Grid item>

                </Grid>
                <Grid item>
                  <Typography variant="h6" fontWeight="bold" sx={{ pt: 1 }}>
                    Kontakt
                  </Typography>
                  <Typography variant="body1" sx={{ pb: 1 }}>
                    Bei Fragen oder Feedback kannst du uns kontaktieren
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid item>
              <Button variant="outlined" color="primary" href="mailto:mensa@heylinus.de" sx={{ ml: 2 }}>
                Kontaktieren
              </Button>
            </Grid>
          </Grid>
        </Grid>


        <Grid item xs={12} textAlign={"center"} sx={{ pt: 6, pb: 25, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="p" fontWeight="300" sx={{ pr: 1 }}>
            App Version: {version}
          </Typography>
          <Typography fontWeight="400">
            |
          </Typography>
          <Button variant="text" style={{ color: theme.palette.text.primary, fontWeight: '400' }} onClick={updateCache}>
            Suche nach Updates
          </Button>
        </Grid>
      </Grid >
    </Grid >
  )
}

export default Settings

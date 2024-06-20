import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CircularProgress, Alert, AlertTitle, Divider, Grid, Typography, Button, Select, Switch, MenuItem, ToggleButtonGroup, ToggleButton, TextField } from '@mui/material';
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
  const [loading, setLoading] = useState(false);
  const [notificationData, setNotificationData] = useState(null);

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

    // Fetch the notification.json file
    const date = new Date().toISOString().split('T')[0];
    fetch(`${process.env.PUBLIC_URL}/data/${date}/notification.json`)
      .then(response => response.json())
      .then(data => {
        if (data.notification && data.notification.title && data.notification.body) {
          setNotificationData(data);
        }
      })
      .catch(error => console.error('Error:', error));
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

  const handleNotificationsToggle = async (event) => {
    setLoading(true);
    if (event.target.checked) {
      if (token === null) {
        try {
          const token = await requestPermissionAndToken();
          dispatch({ type: 'SET_TOKEN', payload: token });
          dispatch({ type: 'SET_NOTIFICATIONS_ENABLED', payload: true });
          enqueueSnackbar('Benachrichtigungen aktiviert', { variant: 'success' });
        } catch (error) {
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
        }
      } else {
        dispatch({ type: 'SET_NOTIFICATIONS_ENABLED', payload: true });
        enqueueSnackbar('Benachrichtigungen aktiviert', { variant: 'success' });
      }
    } else {
      dispatch({ type: 'SET_NOTIFICATIONS_ENABLED', payload: false });
    }
    setLoading(false);
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
          <Typography variant="screenHeading" sx={{ fontSize: '2.5rem', pb: 0 }}>
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
                  <Grid item sx={{ pr: 1 }}>
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
            {loading ? (
              <Grid item justifyContent="flex-end" sx={{ pl: 4, pr: 2 }}>
                <CircularProgress size={'1.5rem'} />
              </Grid>
            ) : (
              <Grid item justifyContent="flex-end" sx={{ pl: 2 }}>
                <Switch checked={notificationsEnabled} onChange={handleNotificationsToggle} />
              </Grid>
            )}
          </Grid>


          {!notificationsEnabled && notificationData && (
            <Grid item>
              <Grid item sx={{ pt: 1, pb: 1 }}>
                <Typography variant="body" fontStyle={'italic'} fontWeight="500" >
                  Die heutige Benachrichtigung wäre:
                </Typography>
              </Grid>
              <Grid item>
                <Alert severity="info">
                  <AlertTitle>{notificationData.notification.title}</AlertTitle>
                  {notificationData.notification.body}
                </Alert>
              </Grid>
            </Grid>
          )}


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


        <div style={{ margin: '2rem 0 16rem' }}>
          <Grid item xs={12} textAlign={"center"} sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
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
          <Grid item xs={12} textAlign={"center"} sx={{ pt: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Typography variant="p" fontWeight="300">
              Weitere Studi-Projekte der HTWK:
            </Typography>
            <Grid item xs={12} textAlign={"center"} sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <Button variant="text" style={{ color: theme.palette.text.primary, fontWeight: '400' }} href="https://www.htwkalender.de/" target="_blank" rel="noopener noreferrer">
                htwkalender.de
              </Button>
            </Grid>
            <Grid item xs={12} textAlign={"center"} sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <Button variant="text" style={{ color: theme.palette.text.primary, fontWeight: '400' }} href="https://www.htwkarte.de/" target="_blank" rel="noopener noreferrer">
                htwkarte.de
              </Button>
            </Grid>
          </Grid>
          <Grid item xs={12} textAlign={"center"} sx={{ pt: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Typography variant="p" fontWeight="300">
              Offizielle Webseite der Mensa:
            </Typography>
            <Grid item xs={12} textAlign={"center"} sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <Button variant="text" style={{ color: theme.palette.text.primary, fontWeight: '400' }} href="https://www.studentenwerk-leipzig.de/mensen-cafeterien/unsere-mensen-cafeterien/mensa-und-cafeteria-academica" target="_blank" rel="noopener noreferrer">
                studentenwerk-leipzig.de
              </Button>
            </Grid>
          </Grid>
          <Grid item xs={12} textAlign={"left"} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Alert sx={{ my: 1, maxWidth: '400px' }} severity="info" >
              Diese App wird nicht offiziell vom Studentenwerk Leipzig oder der HTWK Leipzig unterstützt oder herausgegeben.
            </Alert>
            <Alert sx={{ my: 1, maxWidth: '400px' }} severity="warning" >
              Diese App enthält KI generierte Bilder im Speiseplan und KI generierte Daten für Nährwertabschätzungen. Vertraue diesen Inhalten nicht blind.
            </Alert>
          </Grid>
          <Grid item xs={12} textAlign={"center"} sx={{ pt: 2, pb: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Typography variant="p" fontWeight="300">
              Entwickelt von
            </Typography>
            <Grid item xs={12} textAlign={"center"} sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <Button variant="text" style={{ color: theme.palette.text.primary, fontWeight: '400' }} href="https://www.linkedin.com/in/linus-herterich/" target="_blank" rel="noopener noreferrer">
                Linus Herterich
              </Button>
              <Typography fontWeight="400">
                &
              </Typography>
              <Button variant="text" style={{ color: theme.palette.text.primary, fontWeight: '400' }} href="https://www.linkedin.com/in/jonas-gwozdz/" target="_blank" rel="noopener noreferrer">
                Jonas Gwozdz
              </Button>
            </Grid>
          </Grid>
          <Grid item xs={12} textAlign={"center"} sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <Typography variant="p" fontWeight="300" sx={{ pr: 1 }}>
              Hosting:
            </Typography>
            <Button variant="text" style={{ color: theme.palette.text.primary, fontWeight: '400' }} href="https://www.heylinus.de/" target="_blank" rel="noopener noreferrer">
              HeyLinus.de
            </Button>
          </Grid>
          <Grid item xs={12} textAlign={"center"} sx={{ pt: 1, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <Button variant="text" style={{ color: theme.palette.text.primary, fontWeight: '400' }} href="https://www.heylinus.de/impressum" target="_blank" rel="noopener noreferrer">
              Impressum
            </Button>
            <Typography fontWeight="400">
              |
            </Typography>
            <Button variant="text" style={{ color: theme.palette.text.primary, fontWeight: '400' }} href="https://www.heylinus.de/datenschutz" target="_blank" rel="noopener noreferrer">
              Datenschutz
            </Button>
          </Grid>
        </div>
      </Grid >
    </Grid >
  )
}

export default Settings

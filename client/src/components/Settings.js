import React from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { Divider, Grid, Typography, Button, Select, Switch, MenuItem, ToggleButtonGroup, ToggleButton, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import packageJson from '../../package.json';
import { useTheme } from '@mui/material/styles';

function Settings() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const version = packageJson.version;

  const selectedPriceType = useSelector(state => state.selectedPriceType);
  const notificationsEnabled = useSelector(state => state.notificationsEnabled);
  const selectedDays = useSelector(state => state.selectedDays);
  const notificationTime = useSelector(state => state.notificationTime);
  const appearance = useSelector(state => state.appearance);



  const handlePriceTypeChange = (event) => {
    dispatch({ type: 'SET_PRICE_TYPE', payload: event.target.value });
  };

  const handleNotificationsToggle = (event) => {
    dispatch({ type: 'SET_NOTIFICATIONS_ENABLED', payload: event.target.checked });
  };

  const handleDaysChange = (event, newDays) => {
    dispatch({ type: 'SET_SELECTED_DAYS', payload: newDays });
  };

  const handleTimeChange = (event) => {
    console.log("changed", event.target.value)
    dispatch({ type: 'SET_NOTIFICATION_TIME', payload: event.target.value });
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

  return (
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="flex-start"
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
        <Grid item xs={12} sx={{ mb: 2 }}>
          <Typography variant="p" fontWeight="regular" textTransform="uppercase">
            Einstellungen der Mensa App
          </Typography>
        </Grid>
      </Grid>

      <Grid item xs={12} sx={{ overflow: 'auto', px:2, maxHeight: 'calc(100vh - 144px)' }}>
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
                  <Grid container direction="row" alignItems="center" justifyContent="space-between" >
                    <Grid item>
                      <ToggleButtonGroup value={selectedDays} onChange={handleDaysChange} sx={{ pr: 1 }}>
                        <ToggleButton value="Mo" color="primary">Mo</ToggleButton>
                        <ToggleButton value="Di" color="primary">Di</ToggleButton>
                        <ToggleButton value="Mi" color="primary">Mi</ToggleButton>
                        <ToggleButton value="Do" color="primary">Do</ToggleButton>
                        <ToggleButton value="Fr" color="primary">Fr</ToggleButton>
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
          <Typography variant="h6" fontWeight="bold" sx={{ pt: 1 }}>
            Kontakt
          </Typography>
          <Grid container direction="row" alignItems="center" justifyContent={'space-between'} flexWrap={'nowrap'}>
            <Grid item>
              <Grid container direction="column" alignItems="left">
                <Grid item>

                </Grid>
                <Grid item>
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
    </Grid>
  )
}

export default Settings

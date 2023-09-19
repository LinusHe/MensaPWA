import React, { useState, useEffect } from 'react';
import { BottomSheet } from 'react-spring-bottom-sheet';
import { MobileStepper, IconButton, Grid, Typography, Button } from '@mui/material';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from 'mdi-material-ui/ExportVariant'; // Replace with actual Share icon
import HomeIcon from 'mdi-material-ui/PlusBoxOutline'; // Replace with actual Home icon
import SafariIcon from 'mdi-material-ui/AppleSafari';
import { useTheme } from '@mui/material/styles';


import 'react-spring-bottom-sheet/dist/style.css'

const steps = [
  'Besuchen Sie die Seite in Safari',
  'Klicken Sie auf die Schaltfläche "Teilen" unten',
  'Wählen Sie das Element "Zum Homebildschirm" in der Liste'
];

const getStepContent = (stepIndex) => {
  switch (stepIndex) {
    case 0:
      return 'Besuche die Seite in Safari';
    case 1:
      return 'Klicke auf die Schaltfläche "Teilen" in der unteren Leiste';
    case 2:
      return 'Wähle das Element "Zum Home-Bildschirm" in der Liste';
    default:
      return 'Unbekannter Schritt';
  }
};

const getStepIcon = (stepIndex) => {
  switch (stepIndex) {
    case 0:
      return <SafariIcon style={{ fontSize: 50 }} />;
    case 1:
      return <ShareIcon style={{ fontSize: 50, color: '#3A93FD' }} />;
    case 2:
      return <HomeIcon style={{ fontSize: 50 }} />;
    default:
      return null;
  }
};

const InstallInstructions = ({ open, onDismiss }) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (open) {
      setActiveStep(0);
    }
  }, [open]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  return (
    <BottomSheet
      open={open}
      onDismiss={onDismiss}
      className={theme.palette.mode === 'dark' ? 'dark-mode' : 'light-mode'}
      defaultSnap={({ snapPoints, lastSnap }) =>
        lastSnap ?? Math.min(...snapPoints)
      }
      minheight={50}
      expandOnContentDrag={true}
      style={{ overflow: 'visible', maxWidth: '700px' }}
      onClick={(event) => event.stopPropagation()}
    >
      <IconButton
        aria-label="close"
        onClick={onDismiss}
        sx={{
          position: 'absolute',
          right: 16,
          top: 16,
          color: (theme) => theme.palette.grey[500],
        }}
      >
        <CloseIcon />
      </IconButton>
      <div>
        {activeStep === steps.length ? (
          <Typography>Alle Schritte abgeschlossen - Sie sind fertig</Typography>
        ) : (
          <Grid container sx={{ p: 5 }}>
            <Grid item xs={12} style={{ textAlign: 'center' }}>
              {getStepIcon(activeStep)}
            </Grid>
            <Grid item xs={12}>
              <Typography
                variant="body1"
                align="center"
                sx={{
                  height: '3.5rem',
                  overflow: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {getStepContent(activeStep)}
              </Typography>
            </Grid>
          </Grid>
        )}
      </div>
      <MobileStepper
        variant="dots"
        steps={3}
        position="static"
        activeStep={activeStep}
        sx={{ maxWidth: 400, flexGrow: 1 }}
        nextButton={
          <Button size="small" onClick={handleNext} disabled={activeStep === steps.length - 1}>
            {activeStep === steps.length - 1 ? 'Fertig' : 'Weiter'}
            {theme.direction === 'rtl' ? (
              <KeyboardArrowLeft />
            ) : (
              <KeyboardArrowRight />
            )}
          </Button>
        }
        backButton={
          <Button size="small" onClick={handleBack} disabled={activeStep === 0}>
            {theme.direction === 'rtl' ? (
              <KeyboardArrowRight />
            ) : (
              <KeyboardArrowLeft />
            )}
            Zurück
          </Button>
        }
      />

    </BottomSheet>
  );
};

export default InstallInstructions;
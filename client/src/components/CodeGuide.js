import React, { useState, useEffect } from 'react';
import { BottomSheet } from 'react-spring-bottom-sheet';
import { MobileStepper, IconButton, Grid, Typography, Button } from '@mui/material';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import ImageAreas from '../assets/CodeGuide/Areas.png';
import ImageCodes from '../assets/CodeGuide/Codes.png';
import ImageClock from '../assets/CodeGuide/Clock.png';
import ImageMid from '../assets/CodeGuide/Mid.png';
import ImageExamples from '../assets/CodeGuide/Examples.png';

import 'react-spring-bottom-sheet/dist/style.css';

const steps = [
  {
    heading: 'Struktur des Sitzplatz-Codes',
    content: [
      'Jeder Sitzplatz-Code besteht aus drei Stellen.',
      'Erste Stelle: Bereich der Mensa (N, M, S).',
      'Zweite Stelle: Position oder Etage (Zahl).',
      'Dritte Stelle: Nähe zur Mitte oder Richtung (Buchstabe).',
      'Links enthalten eine vierte Stelle, um Tische mit gleichen Codes zu unterscheiden.'
    ],
    image: ImageCodes
  },
  {
    heading: 'Bereichsaufteilung und Regionen',
    content: [
      'Die Mensa ist in drei Hauptbereiche unterteilt:',
      'Norden (N), Mitte (M) und Süden (S).',
      '👆 Merkhilfe: "Norden" ist Richtung Innenstadt, "Süden" ist Richtung Connewitz.'
    ],
    image: ImageAreas
  },
  {
    heading: 'Sitzplatz-Codes für N und S',
    content: [
      'Wenn du im N oder S bereich sitzt, repräsentiert die mittlere Zahl im Code die Position wie auf einer Uhr ⏱️:',
      '12 ist oben (Richgung Speiseausgabe)',
      '6 ist unten (Richtung Toiletten).',
      'Der letzte Buchstabe gibt die Nähe zur Mitte an: "I" für innere und "A" für äußere Sitzplätze.'
    ],
    image: ImageClock
  },
  {
    heading: 'Sitzplatz-Codes für M',
    content: [
      'Für den mittleren Bereich (M) gibt die Zahl die Etage an: 0 ist das Erdgeschoss (Höhe der Essensausgabe), 3 die oberste Etage (Höhe des Foyers).',
      'Der letzte Buchstabe des Codes gibt die Richtung an: "N" für nördlich, "M" für mittig und "S" für südlich.'
    ],
    image: ImageMid
  },
  {
    heading: 'Beispiele',
    content: [
      '"N12I-1": Nördlicher Bereich, 12 Uhr, innen.',
      '"M2S-2": Mittlerer Bereich, 2. Etage, südlich.',
      '"S7A-3": Südlicher Bereich, 7 Uhr, außen.'
    ],
    image: ImageExamples
  }
];



const getStepContent = (stepIndex) => {
  return steps[stepIndex];
};

const CodeGuide = ({ open, onDismiss }) => {
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
      minHeight={50}
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
          <Grid container sx={{ px: 5, pb: 3 }}>
            <Grid item xs={12} sx={{ textAlign: 'center', pt: 1, pb: 3, px: 1 }}>
              <Typography variant="h5">{getStepContent(activeStep).heading}</Typography>
            </Grid>
            {getStepContent(activeStep).image && (
              <Grid item xs={12} sx={{ textAlign: 'center', pb: 3 }}>
                <img style={{ maxHeight: '12rem', maxWidth: '100%' }} src={getStepContent(activeStep).image} alt="Step" />
              </Grid>
            )}
            {getStepContent(activeStep).content.map((text, index) => (
              <Grid item xs={12} key={index}>
                <Typography textAlign={'center'} pb={1}>{text}</Typography>
              </Grid>
            ))}
          </Grid>
        )}
      </div>
      <MobileStepper
        variant="dots"
        steps={steps.length}
        position="static"
        activeStep={activeStep}
        sx={{ flexGrow: 1 }}
        nextButton={
          <Button
            size="small"
            onClick={() => {
              if (activeStep === steps.length - 1) {
                onDismiss();
              } else {
                handleNext();
              }
            }}
          >
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

export default CodeGuide;

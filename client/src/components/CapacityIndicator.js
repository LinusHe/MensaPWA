import React from 'react'
import { Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import CapacityGraph from './CapacityGraph';
import CapacityData from '../assets/mensaCapacity.json'
import CapacityCard from './CapacityCard';


function CapacityIndicator() {
  let currentHour = new Date().getHours().toString();
  let currentMinute = new Date().getMinutes().toString().padStart(2, '0');;
  // Get the current day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  let currentDay = new Date().getDay();
  // DEBUG
  // currentHour = '12';
  // currentMinute = '44';
  // currentDay = 0;
  const currentTime = `${currentHour}:${currentMinute}`;
  const openingTime = '10:00';
  const closingTime = '15:00';
  const mensaCapacity = require('../assets/mensaCapacity.json');
  let greyed = false;

  const calculateCurentCapacity = () => {
    let previousTime = mensaCapacity[0].data[0].x;
    let previousValue = mensaCapacity[0].data[0].y;
    let nextTime = mensaCapacity[0].data[1].x;
    let nextValue = mensaCapacity[0].data[1].y;
    let i = 1;

    while (currentTime > nextTime && i < mensaCapacity[0].data.length - 1) {
      previousTime = nextTime;
      previousValue = nextValue;
      i++;
      nextTime = mensaCapacity[0].data[i].x;
      nextValue = mensaCapacity[0].data[i].y;
    }

    const previousTimeInMinutes = parseInt(previousTime.split(':')[0]) * 60 + parseInt(previousTime.split(':')[1]);
    const nextTimeInMinutes = parseInt(nextTime.split(':')[0]) * 60 + parseInt(nextTime.split(':')[1]);
    const currentTimeInMinutes = parseInt(currentHour) * 60 + parseInt(currentMinute);

    const interpolatedValue = previousValue + (nextValue - previousValue) * ((currentTimeInMinutes - previousTimeInMinutes) / (nextTimeInMinutes - previousTimeInMinutes));
    return ('~' + interpolatedValue.toFixed(0) + "%");
  }

  // Helper function to convert time string to minutes
  const timeToMinutes = (timeStr) => {
    return parseInt(timeStr.split(':')[0]) * 60 + parseInt(timeStr.split(':')[1]);
  };

  // Calculate peak times
  const calculatePeaks = () => {
    let peaks = [];
    let max = mensaCapacity[0].data[0].y;
    for (let i = 1; i < mensaCapacity[0].data.length - 1; i++) {
      if (mensaCapacity[0].data[i].y > mensaCapacity[0].data[i - 1].y && mensaCapacity[0].data[i].y > mensaCapacity[0].data[i + 1].y) {
        peaks.push(mensaCapacity[0].data[i].x);
      }
    }
    return peaks;
  };

  // Calculate time to next peak
  const calculateTimeToNextPeak = () => {
    const currentTimeInMinutes = timeToMinutes(currentTime);
    const peaks = calculatePeaks();
    for (let i = 0; i < peaks.length; i++) {
      const peakTimeInMinutes = timeToMinutes(peaks[i]);
      if (peakTimeInMinutes > currentTimeInMinutes) {
        const diff = peakTimeInMinutes - currentTimeInMinutes;
        return diff > 60 ? (diff / 60).toFixed(1) + ' Stunden' : Math.round(diff) + ' Minuten';
      }
    }
    return calculateTimeToClosing();
  };

  // Calculate time to closing
  const calculateTimeToClosing = () => {
    const currentTimeInMinutes = timeToMinutes(currentTime);
    const closingTimeInMinutes = timeToMinutes(closingTime);
    const diff = closingTimeInMinutes - currentTimeInMinutes;
    return diff > 60 ? (diff / 60).toFixed(1) + ' Stunden' : Math.round(diff) + ' Minuten';
  };

  // Calculate time to opening
  const calculateTimeToOpening = () => {
    const currentTimeInMinutes = timeToMinutes(currentTime);
    const openingTimeInMinutes = timeToMinutes(openingTime);
    let diff = openingTimeInMinutes - currentTimeInMinutes;

    // If the current time is after the closing time, add 24 hours (1440 minutes) to the difference
    if (currentTimeInMinutes > timeToMinutes(closingTime)) {
      diff += 24 * 60;
    }
  
    // If it's Friday, add 48 hours (2880 minutes) to the difference
    if (currentDay === 5) {
      diff += 48 * 60;
    }
  
    // If it's Saturday, add 24 hours (1440 minutes) to the difference
    if (currentDay === 6) {
      diff += 24 * 60;
    }

    return diff > 1440 ? (diff / 1440).toFixed(1) + ' Tage' : diff > 60 ? (diff / 60).toFixed(1) + ' Stunden' : Math.round(diff) + ' Minuten';
  };

  // Generate display strings
  const currentTimeInMinutes = timeToMinutes(currentTime);
  const closingTimeInMinutes = timeToMinutes(closingTime);
  const openingTimeInMinutes = timeToMinutes(openingTime);


  let topString = 'Nächster Ansturm'.toUpperCase();
  let bottomString = 'In ca. '.toUpperCase() + calculateTimeToNextPeak();

  // Only show "Mensa schließt" after the last peak
  if (currentTimeInMinutes < openingTimeInMinutes) {
    topString = 'Mensa öffnet'.toUpperCase();
    bottomString = 'In ca. '.toUpperCase() + calculateTimeToOpening();
    greyed = true;
  } else if (currentTimeInMinutes > closingTimeInMinutes) {
    topString = 'Mensa öffnet'.toUpperCase();
    bottomString = 'In ca. '.toUpperCase() + calculateTimeToOpening();
    greyed = true;
  } else if (currentTimeInMinutes >= timeToMinutes(calculatePeaks().slice(-1)[0])) {
    topString = 'Mensa schließt'.toUpperCase();
    bottomString = 'In ca. '.toUpperCase() + calculateTimeToClosing();
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
      sx={{ minHeight: 'calc(100vh - 80px)' }}
    >
      <Grid item xs={12} sx={{ p: 2, flexGrow: 0 }}>
        <Typography variant="screenHeading">
          Ansturm
        </Typography>
        <Typography variant="p" fontWeight="regular" textTransform="uppercase">
          Schätzung nach Erfahrungswerten
        </Typography>
      </Grid>
      <Grid item xs={12} sx={{ flexGrow: 1, pt:greyed?0:2 }}>
        <CapacityGraph data={CapacityData} currentTimeString={currentTime} currentCapa={calculateCurentCapacity()} greyed={greyed}></CapacityGraph>
      </Grid>
      <Grid item sx={{ pt: 3, flexGrow: 0, display: 'flex', justifyContent: 'center' }}>
        <CapacityCard data={CapacityData} currentTimeString={currentTime} topString={topString} bottomString={bottomString}></CapacityCard>
      </Grid>
    </Grid>
  )
}

export default CapacityIndicator
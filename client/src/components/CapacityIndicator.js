import React from 'react'
import { Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import CapacityGraph from './CapacityGraph';
import CapacityData from '../assets/mensaCapacity.json'


function CapacityIndicator() {
  let currentHour = new Date().getHours().toString();
  let currentMinute = new Date().getMinutes().toString();

  const calculateCurentCapacity = () => {
      const mensaCapacity = require('../assets/mensaCapacity.json');
      const currentTime = `${currentHour}:${currentMinute}`;
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
      return('~'+interpolatedValue.toFixed(0)+"%");
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
      <Grid item xs={12} sx={{ flexGrow: 1 }}>
        <CapacityGraph data={CapacityData} currentCapa={calculateCurentCapacity()}></CapacityGraph>
      </Grid>
    </Grid>
  )
}

export default CapacityIndicator
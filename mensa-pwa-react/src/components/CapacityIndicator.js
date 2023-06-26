import React from 'react'
import { Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import CapacityGraph from './CapacityGraph';
// import CapacityData from '../assets/mensaCapacity.json'


function CapacityIndicator() {
  const data = [
    {
      id: 'Graph 1',
      data: [
        { x: '1', y: 5 },
        { x: '2', y: 8 },
        { x: '3', y: 6 },
        { x: '4', y: 12 },
        // Weitere Datenpunkte hier...
      ]
    }
  ];


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
          Ansturm
        </Typography>
      </Grid>
      <Grid item xs={12} sx={{ pb: 3 }}>
        <Typography variant="p" fontWeight="regular" textTransform="uppercase">
          Schätzung nach Erfahrungswerten
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="p" fontWeight="light">
          <CapacityGraph data={data}></CapacityGraph>
        </Typography>
      </Grid>
    </Grid>
  )
}

export default CapacityIndicator
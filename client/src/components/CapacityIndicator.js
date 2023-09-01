import React from 'react'
import { Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import CapacityGraph from './CapacityGraph';
import CapacityData from '../assets/mensaCapacity.json'


function CapacityIndicator() {
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
        <CapacityGraph data={CapacityData}></CapacityGraph>
      </Grid>
    </Grid>
  )
}

export default CapacityIndicator
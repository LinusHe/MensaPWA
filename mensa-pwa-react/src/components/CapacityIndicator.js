import React from 'react'
import { Grid } from '@mui/material';
import Typography from '@mui/material/Typography';


function CapacityIndicator() {
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
      <Grid item xs={12} sx={{pb:3}}>
        <Typography variant="p" fontWeight="regular" textTransform="uppercase">
          Schätzung nach Erfahrungswerten
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="p" fontWeight="light">
          Capacity Indicator comes here
        </Typography>
      </Grid>
    </Grid>
  )
}

export default CapacityIndicator
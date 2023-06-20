import React from 'react'
import { Grid } from '@mui/material';
import Typography from '@mui/material/Typography';


function FoodMenu() {
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
          Speiseplan
        </Typography>
      </Grid>
      <Grid item xs={12} sx={{ pb: 3 }}>
        <Typography variant="p" fontWeight="regular" textTransform="uppercase">
          Heutige Gerichte
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="p" fontWeight="light">
          Food Menu Engine comes here
        </Typography>
      </Grid>
    </Grid>
  )
}

export default FoodMenu
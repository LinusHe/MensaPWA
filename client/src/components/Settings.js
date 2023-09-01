import React from 'react'
import { Grid } from '@mui/material';
import Typography from '@mui/material/Typography';

function Settings() {
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
          Einstellungen
        </Typography>
      </Grid>
      <Grid item xs={12}>
      <Typography variant="p" fontWeight="light">
          Settings comes here
        </Typography>
      </Grid>
    </Grid>
  )
}

export default Settings
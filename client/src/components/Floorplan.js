import React from 'react'
import { Grid } from '@mui/material';
import { useParams } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import FloorplanSelector from './FloorplanSelector';

function Floorplan() {
  const { code } = useParams();

  return (
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="flex-start"
      rowSpacing={0}
      columnSpacing={0}
      sx={{height: "100vh", overflow: "hidden"}}
    >
      <Grid item xs={12} sx={{ p: 2}}>
        <Typography variant="screenHeading">
          Sitzplatz{' '}
          <Typography component="span" variant="span" fontWeight="300">
            teilen
          </Typography>
        </Typography>
      </Grid>
      <Grid item xs={12}>
          <FloorplanSelector code={code} />
      </Grid>
    </Grid>
  )
}

export default Floorplan
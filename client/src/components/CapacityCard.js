import React from 'react'
import { Grid, Card } from '@mui/material';
import Typography from '@mui/material/Typography';
import InfoIcon from '@mui/icons-material/Info';


function CapacityCard({ data, currentTimeString, topString, bottomString }) {

  return (
    <Card sx={{ border: 2, borderColor: 'primary.main', borderRadius: '1rem', display: 'inline-block' }}>
      <Grid container alignItems="center" sx={{ p: 1.5, pt: 2.5 }}>
        <Grid item>
          <InfoIcon color="primary" fontSize="large" />
        </Grid>
        <Grid item sx={{ pl: 1, pr: 1, flexGrow: 1, justifyContent: 'center' }}>
          <Typography variant="body1" sx={{ lineHeight: 1 }} textTransform="uppercase">{topString}</Typography>
          <Typography variant="h6" fontWeight="bold" textTransform="uppercase">{bottomString}</Typography>
        </Grid>
      </Grid>
    </Card>
  )
}

export default CapacityCard
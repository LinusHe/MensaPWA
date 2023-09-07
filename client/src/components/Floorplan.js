import React, { useState, useEffect } from 'react'
import { Grid } from '@mui/material';
import { useParams, Navigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import FloorplanSelector from './FloorplanSelector';
import FloorplanIndicator from './FloorplanIndicator';
import { isValidCode } from '../utils/codeValidation';

function Floorplan() {
  let { code } = useParams();
  const [invalidCode, setInvalidCode] = useState(false);

  React.useEffect(() => {
    if (code && !isValidCode(code)) {
      // Redirect to home page if the code is not valid and the url is not / 
      console.warn(`Code ${code} is not valid`);
      setInvalidCode(true);
    }
    else {
      console.log(`Code ${code} is valid`);
      setInvalidCode(false);
    }
  }, [code]);

  if (invalidCode) {
    return <Navigate to="/" />;
  }

  return (
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="flex-start"
      rowSpacing={0}
      columnSpacing={0}
      sx={{ height: "100vh", overflow: "hidden" }}
    >
      <Grid item xs={12} sx={{ p: 2 }}>
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
      <FloorplanIndicator code={code} />
    </Grid>
  )
}

export default Floorplan
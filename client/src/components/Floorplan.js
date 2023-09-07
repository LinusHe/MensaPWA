import React, { useState, useEffect } from 'react'
import { Grid } from '@mui/material';
import { useParams, Navigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import FloorplanSelector from './FloorplanSelector';
import FloorplanIndicator from './FloorplanIndicator';
import { isValidCode } from '../utils/codeValidation';

function Floorplan() {
  // const [code, setCode] = React.useState('000');
  // const { params } = useParams();
  let { code } = useParams();
  const [navigate, setNavigate] = useState(false);

  React.useEffect(() => {
    if (code && !isValidCode(code)) {
      // Redirect to home page if the code is not valid and the url is not / 
      console.warn(`Code ${code} is not valid`);
      setNavigate(true);
    }
    else {
      console.log(`Code ${code} is valid`);
      setNavigate(false);
    }
  }, [code]);

  if (navigate) {
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
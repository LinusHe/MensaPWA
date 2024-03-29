/* eslint-disable no-dupe-keys */

import React, { useState } from 'react'
import { Grid, Typography } from '@mui/material';
import { IconButton } from '@mui/material';
import HelpIcon from 'mdi-material-ui/Help';
import { useParams, Navigate } from 'react-router-dom';
import FloorplanSelector from './FloorplanSelector';
import FloorplanIndicator from './FloorplanIndicator';
import { isValidCode } from '../utils/codeValidation';
import { Helmet } from 'react-helmet-async';
import { useTheme } from '@mui/material/styles';
import CodeGuide from './CodeGuide';

// import html2canvas from 'html2canvas';
// import { saveAs } from 'file-saver';

function Floorplan() {
  const theme = useTheme();
  let { code } = useParams();
  const [invalidCode, setInvalidCode] = useState(false);

  const [openCodeGuide, setOpenCodeGuide] = useState(false);

  const handleOpenCodeGuide = () => {
    setOpenCodeGuide(true);
  };

  const handleCloseCodeGuide = () => {
    setOpenCodeGuide(false);
  };

  React.useEffect(() => {
    if (code && !isValidCode(code)) {
      // Redirect to home page if the code is not valid and the url is not / 
      // console.warn(`Code ${code} is not valid`);
      setInvalidCode(true);
    }
    else {
      // console.log(`Code ${code} is valid`);
      setInvalidCode(false);
    }
  }, [code]);

  // React.useEffect(() => {
  //   setTimeout(() => {
  //     const element = document.getElementById('map-holder');
  //     if (element) {
  //       html2canvas(element).then((canvas) => {
  //         const context = canvas.getContext('2d');
  //         const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  //         const squareSize = Math.min(canvas.width, canvas.height);
  //         const offsetX = (canvas.width - squareSize) / 2;
  //         // const offsetY = (canvas.height - squareSize) / 2;
  //         const offsetY = 140;
  //         const squareCanvas = document.createElement('canvas');
  //         squareCanvas.width = squareSize;
  //         squareCanvas.height = squareSize;
  //         const squareContext = squareCanvas.getContext('2d');
  //         squareContext.putImageData(imageData, -offsetX, -offsetY);
  //         squareCanvas.toBlob((blob) => {
  //           saveAs(blob, `${code}.png`);
  //         });
  //       });
  //     }
  //   }, 500);
  // }, [code]);

  if (invalidCode) {
    return <Navigate to="/" />;
  }

  return (
    <div>
      <Helmet>
        {code ? <title>{`${code} - Mensa Sitzplatz`}</title> : <title>{`Mensa Sitzplatz teilen`}</title>}
        <meta name="description" content={`Klicke auf den Link, um zu sehen, wo ${code} ist.`} />
        <meta property="og:image" content={`${process.env.PUBLIC_URL}/image/codePreviewImg/${code}.png`} />
      </Helmet>
      <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="flex-start"
        rowSpacing={0}
        columnSpacing={0}
        className='fullHeight'
        sx={{ overflow: "hidden" }}
      >
        <Grid item xs={12} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', mx: 'auto' }}>
          <Typography variant="screenHeading" sx={{ fontSize: '2.5rem', pb: 0 }}>
            Sitzplatz{' '}
            <Typography component="span" variant="span" fontWeight="300">
              teilen
            </Typography>
          </Typography>
          <IconButton
            onClick={handleOpenCodeGuide}
            sx={{
              border: `1px solid ${theme.palette.btnBorder.main}`,
              backgroundColor: 'background.paper',
              boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.08)'
            }}>
            <HelpIcon />
          </IconButton>
        </Grid>

        <CodeGuide
          open={openCodeGuide}
          onDismiss={handleCloseCodeGuide}
        />

        <Grid item xs={12} sx={{ height: '100vh', height: '-webkit-fill-available', overflow: 'hidden' }}>
          <FloorplanSelector code={code} />
        </Grid>
        <FloorplanIndicator code={code} />
      </Grid>
    </div>

  )
}

export default Floorplan
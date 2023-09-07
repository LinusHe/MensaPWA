import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Paper, Typography, Grid, Fab } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import theme from '../theme';

function FloorplanIndicator() {
  let { code } = useParams();
  let navBarHeight = useSelector(state => state.navBarHeight);
  const [bottomPadding, setBottomPadding] = useState(0);

  useEffect(() => {
    setBottomPadding(navBarHeight);
  }, [navBarHeight, code]);

  if (!code) {
    navBarHeight = 0;
    return null;
  }

  const shareData = {
    title: 'Teile deinen Sitzplatz (' + code + ')',
    text: 'Ich bin in der Mensa und Sitze bei:' + code + ': ' + window.location.href,
  };

  const shareUrl = () => {
    navigator.share(shareData)
      .then(() => console.log('URL shared successfully'))
      .catch((err) => console.log('Error: ' + err));
  };

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: '30px 30px 0 0', boxShadow: '0px -10px 20px 0 rgba(0, 0, 0, 0.1)', backgroundColor: theme.palette.primary.main, paddingBottom: bottomPadding + 'px', transition: 'padding 0.5s' }}>
      <Grid container alignItems="center" justifyContent="center" sx={{ mt: 2, mb: 2 }}>
        <Grid item sx={{ mr: 2 }}>
          <Typography variant="h6" color="white" fontWeight="bold" >
            Dein Sitzplatz:{' '}
            <Typography component="span" variant="span" fontWeight="300">
              {code}
            </Typography>
          </Typography>
        </Grid>
        <Grid item>
          <Fab size="small" sx={{ bgcolor: 'background.paper' }} aria-label="share" onClick={shareUrl}>
            <ShareIcon color="primary" />
          </Fab>
        </Grid>
      </Grid>
    </Paper>
  )
}

export default FloorplanIndicator
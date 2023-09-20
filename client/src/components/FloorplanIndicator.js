import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Paper, Typography, Grid, Fab } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import FileCopyIcon from '@mui/icons-material/ContentCopy';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';

function FloorplanIndicator() {
  const theme = useTheme();
  let { code } = useParams();
  let navBarHeight = useSelector(state => state.navBarHeight);
  const [bottomPadding, setBottomPadding] = useState(0);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    setBottomPadding(navBarHeight);
  }, [navBarHeight, code]);

  if (!code) {
    navBarHeight = 0;
    return null;
  }

  const shareUrl = () => {
    const isFirefox = typeof InstallTrigger !== 'undefined'; // Check if browser is Firefox

    const shareData = {
      title: 'Teile deinen Sitzplatz (' + code + ')',
      text: 'Ich bin in der Mensa und sitze bei "' + code + '". \n' + window.location.href,
    };

    const shareDataUrlOnly = {
      title: 'Teile deinen Sitzplatz (' + code + ')',
      url: window.location.href
    };

    if (navigator.share) {
      if ((navigator.canShare && navigator.canShare(shareData)) && !isFirefox) {
        navigator.share(shareData)
          .then(() => ('URL shared successfully'))
          .catch((err) => console.loge.log('Error: ' + err));
      } else if (navigator.canShare && navigator.canShare(shareDataUrlOnly)) {
        navigator.share(shareDataUrlOnly)
          .then(() => console.log('URL shared successfully without text'))
          .catch((err) => console.log('Error: ' + err));
      } else {
        console.log('Share data cannot be shared');
      }
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareData.text)
        .then(() => {
          console.log('Text copied to clipboard');
          enqueueSnackbar('Sitzplan-Code "' + code + '" wurde erfolgreich in die Zwischenablage kopiert.', { variant: 'success' });
        })
        .catch((err) => console.log('Error: ' + err));
    } else {
      // console.log('Share and clipboard functions are not supported');
    }
  };

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: '30px 30px 0 0', boxShadow: '0px -10px 20px 0 rgba(0, 0, 0, 0.1)', backgroundColor: theme.palette.primary.dark, paddingBottom: 'calc(env(safe-area-inset-bottom) + ' + bottomPadding + 'px)', transition: 'padding 0.5s' }}>
      {/* // <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: '30px 30px 0 0', boxShadow: '0px -10px 20px 0 rgba(0, 0, 0, 0.1)', backgroundColor: theme.palette.primary.main, paddingBottom: bottomPadding + 'px', transition: 'padding 0.5s' }}> */}
      <Grid container alignItems="center" justifyContent="center" sx={{ mt: 2.5, mb: 2.5 }}>
        <Grid item sx={{ mr: 2 }}>
          <Typography variant="h6" color="white" fontWeight="bold" sx={{ml:1, lineHeight: 1}} >
            Dein Sitzplatz:{' '}
            <Typography component="span" variant="span" fontWeight="300">
              {code}
            </Typography>
          </Typography>
          {/* <Link
            component="button"
            variant="body2"
            sx={{
              color: 'rgb(255 255 255 / 80%)',
              textDecorationColor: 'rgb(255 255 255 / 29%)',
              fontStyle: 'italic',
              display: 'flex',
              alignItems: 'center',
              fontWeight: '300',
            }}
            onClick={() => {
              console.info("Was der Code bedeutet");
            }}
          >
            <ArrowRightIcon sx={{ color: 'rgb(255 255 255 / 29%)', }} />
            Was der Code bedeutet
          </Link> */}
        </Grid>
        <Grid item>
          <Fab size="small" sx={{ bgcolor: 'background.paper' }} aria-label="share" onClick={shareUrl}>
            {navigator.share ? <ShareIcon color="primary" /> : <FileCopyIcon color="primary" />}
          </Fab>
        </Grid>
      </Grid>
    </Paper>
  )
}

export default FloorplanIndicator
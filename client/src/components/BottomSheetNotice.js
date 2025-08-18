import React from 'react';
import { BottomSheet } from 'react-spring-bottom-sheet';
import 'react-spring-bottom-sheet/dist/style.css';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

const LOCAL_STORAGE_KEY = 'hideHtwkHostNotice';

function BottomSheetNotice() {
  const [open, setOpen] = React.useState(false);
  const [dontShowAgain, setDontShowAgain] = React.useState(false);
  const theme = useTheme();

  const isOnHtwkDomain = /\.htwk-leipzig\.de$/i.test(window.location.hostname);

  React.useEffect(() => {
    if (isOnHtwkDomain) {
      return;
    }
    const isHidden = localStorage.getItem(LOCAL_STORAGE_KEY) === '1';
    if (!isHidden) {
      setOpen(true);
    }
  }, [isOnHtwkDomain]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleDontShowAgainChange = (event) => {
    const checked = event.target.checked;
    setDontShowAgain(checked);
    if (checked) {
      localStorage.setItem(LOCAL_STORAGE_KEY, '1');
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  if (isOnHtwkDomain) {
    return null;
  }

  const htwkTargetUrl = new URL(
    window.location.pathname + window.location.search + window.location.hash,
    'https://mensa.fsr.imn.htwk-leipzig.de'
  ).toString();

  return (
    <BottomSheet
      open={open}
      onDismiss={handleClose}
      className={theme.palette.mode === 'dark' ? 'dark-mode' : 'light-mode'}
      defaultSnap={({ snapPoints, lastSnap }) => lastSnap ?? Math.min(...snapPoints)}
      minHeight={50}
      expandOnContentDrag={true}
      style={{ overflow: 'visible', maxWidth: '700px' }}
      onClick={(event) => event.stopPropagation()}
    >
      <IconButton
        aria-label="close"
        onClick={handleClose}
        sx={{ position: 'absolute', right: 16, top: 16, color: (theme) => theme.palette.grey[500] }}
      >
        <CloseIcon />
      </IconButton>
      <Box sx={{ px: 5, pb: 3, pt: 2 }}>
        <Box sx={{ textAlign: 'center', pt: 0, pb: 3, px: 1 }}>
          <Typography variant="h5">Jetzt verfügbar: Offizielle HTWK-Version</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', pb: 2 }}>
          <Typography variant="body2">
            Die MensaMate App wird nun auch auf einem offiziellen HTWK-Server gehostet.
            <br />
            Danke an den FSR IM für die Unterstützung.
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            href={htwkTargetUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mb: 2 }}
          >
            Zur HTWK-Version
          </Button>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" display="block" sx={{ mb: 2 }}>
            Unter dieser URL (mensa.heylinus.de) ist die App vorerst auch weiterhin verfügbar.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <FormControlLabel
            control={<Checkbox checked={dontShowAgain} onChange={handleDontShowAgainChange} />}
            label="Diesen Hinweis nicht mehr anzeigen"
          />
        </Box>
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Button variant="text" onClick={handleClose}>Schließen</Button>
        </Box>
      </Box>
    </BottomSheet>
  );
}

export default BottomSheetNotice;



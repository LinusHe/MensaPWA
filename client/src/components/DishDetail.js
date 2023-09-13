import React from 'react'
import { Grid, Dialog, DialogTitle, DialogContent, Typography, Slide, useTheme, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} timeout={500} />;
});

const DishDetail = ({ open, handleClose, dish }) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={(event) => handleClose(event)}
      fullWidth
      maxWidth="sm"
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        style: {
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.shadows[5],
          margin: 0,
          position: 'absolute',
          borderRadius: '30px 30px 0px 0px',
          bottom: '0',
          width: '100%',
          overflow: 'visible',
          padding: '6rem 0px calc(env(safe-area-inset-bottom) + 1rem) 0px',
        },
      }}
    >
      <img
        src={dish.imageSrc}
        alt={dish.title}
        style={{
          position: 'absolute',
          top: '-70px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          maskImage: 'radial-gradient(circle, black 100%, white 100%)',
          width: '192px'
        }}
      />

      <DialogTitle >
        <Grid container direction="column" alignItems="center">
          <Grid item>
            <Typography variant="caption" color="primary" align='center' fontSize={'1rem'}>
              {dish.category}
            </Typography>
          </Grid>
          <Grid item textAlign={'center'}>
            <Typography variant="body" fontWeight={'bold'} align='center' fontSize={'1.3rem'} >
              {dish.title}
            </Typography>
          </Grid>
          <Grid item textAlign={'center'}>
            {dish.additional_title_lines.length > 0 && dish.additional_title_lines.every(line => line.trim() !== '') &&
              <Typography variant="p" fontWeight={'500'} fontSize={'1rem'}>
                {dish.additional_title_lines.map((line, index) => <React.Fragment key={index}>{line}</React.Fragment>)}
              </Typography>
            }
          </Grid>
        </Grid>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2">{dish.chat_completion}</Typography>
        {/* Add more details as needed */}
      </DialogContent>
    </Dialog>
  );
}

export default DishDetail
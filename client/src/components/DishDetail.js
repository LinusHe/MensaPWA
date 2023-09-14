import React from 'react'
import { styled } from '@mui/material/styles';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';
import { Chip, Grid, DialogTitle, DialogContent, Typography, IconButton, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { BottomSheet } from 'react-spring-bottom-sheet'

import 'react-spring-bottom-sheet/dist/style.css'


const DishDetail = ({ open, handleClose, dish, onDismiss }) => {
  const nutritionValues = dish.chat_completion.match(/\d+/g);
  const hasNutritionValues = nutritionValues && nutritionValues.length === 3;

  const StyledLinearProgress = styled(({ color, ...otherProps }) => <LinearProgress {...otherProps} />)(({ theme, color }) => ({
    height: 5,
    borderRadius: 5,
    [`&.${linearProgressClasses.colorPrimary}`]: {
      backgroundColor: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
    },
    [`& .${linearProgressClasses.bar}`]: {
      borderRadius: 5,
      backgroundColor: theme.palette.food[color],
    },
  }));

  return (
    <BottomSheet
      open={open}
      onDismiss={onDismiss}

      // snapPoints={({ minHeight }) => [minHeight, '50', '70']}
      defaultSnap={({ snapPoints, lastSnap }) =>
        lastSnap ?? Math.min(...snapPoints)
      }
      // snapPoints={({ maxHeight }) => [
      //   maxHeight - maxHeight / 5,
      //   maxHeight * 0.6,
      // ]}
      minheight={50}
      expandOnContentDrag={true}
      style={{ overflow: 'visible', maxWidth: '700px' }}
      onClick={(event) => event.stopPropagation()}
    // header={
    //   <>

    //   </>
    // }
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
          width: '192px',
        }}
      />
      <DialogTitle sx={{ pt: 13 }}>

        <Grid container direction="column" alignItems="center">
          <Grid item>
            <Typography variant="caption" color="primary" align='center' fontSize={'1rem'}>
              {dish.category}
            </Typography>
          </Grid>
          <Grid item textAlign={'center'} lineHeight={'1.2'} sx={{ mb: 1, mt: 1 }}>
            <Typography variant="body" fontWeight={'bold'} align='center' fontSize={'1.3rem'} >
              {dish.title}
            </Typography>
          </Grid>
          <Grid item textAlign={'center'} lineHeight={'1'} sx={{ mb: 1.5 }}>
            {dish.additional_title_lines.length > 0 && dish.additional_title_lines.every(line => line.trim() !== '') &&
              <Typography variant="p" fontWeight={'500'} fontSize={'1rem'} lineHeight={'1'}>
                {dish.additional_title_lines.map((line, index) => <React.Fragment key={index}>{line}</React.Fragment>)}
              </Typography>
            }
          </Grid>
          <Grid item textAlign={'center'}>
            {dish.selections && dish.selections.map((selection, index) => {
              const selectionData = dish.selectionMap[selection] || { ...dish.selectionMap.default, label: selection };
              const { color, label, icon: Icon } = selectionData;
              return (
                <Chip
                  key={index}
                  label={label}
                  variant="outlined"
                  icon={<Icon color={color} />}
                  size='small'
                  sx={{ borderColor: color, color: color, margin: '8px 8px 0px 0px' }}
                />
              );
            })}
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
      <Divider sx={{ width: '80%', margin: '.5rem auto' }} />
      <DialogContent>
        <Grid container spacing={3} justifyContent={'center'}>
          <Grid item xs={6} justifyContent={'center'}>
            <Typography variant="h3" fontWeight={'500'} fontSize={'1rem'} sx={{ mb: 2 }}>
              Preise
            </Typography>
            <Grid container direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2">Studierende</Typography>
              <Chip label={dish.prices.student} size="small" style={{ backgroundColor: '#F2F4FF', color: "#202021", fontWeight: 500 }} />
            </Grid>
            <Grid container direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2">Mitarbeitende</Typography>
              <Chip label={dish.prices.employee} size="small" style={{ backgroundColor: '#F2F4FF', color: "#202021", fontWeight: 500 }} />
            </Grid>
            <Grid container direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2">Externe</Typography>
              <Chip label={dish.prices.guest} size="small" style={{ backgroundColor: '#F2F4FF', color: "#202021", fontWeight: 500 }} />
            </Grid>
          </Grid>

          {/* <Typography variant="body2">{dish.chat_completion}</Typography> */}
          {hasNutritionValues ? (
            <>
              <Grid item xs={6} sx={{mb:2}}>
                <Typography variant="h3" fontWeight={'500'} fontSize={'1rem'} sx={{ mb: 2 }}>
                  Nährwertschätzung
                </Typography>
                <Grid container direction="row" justifyContent="space-between" alignItems="center" >
                  <Typography variant="body2">Kohlenhydrate</Typography>
                  <Typography variant="body2">{parseInt(nutritionValues[0])}%</Typography>
                </Grid>
                <StyledLinearProgress color="chicken" variant="determinate" value={parseInt(nutritionValues[0])} />

                <Grid container direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                  <Typography variant="body2">Proteine</Typography>
                  <Typography variant="body2">{parseInt(nutritionValues[1])}%</Typography>
                </Grid>
                <StyledLinearProgress color="alcohol" variant="determinate" value={parseInt(nutritionValues[1])} />

                <Grid container direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                  <Typography variant="body2">Fette</Typography>
                  <Typography variant="body2">{parseInt(nutritionValues[2])}%</Typography>
                </Grid>
                <StyledLinearProgress color="bio" variant="determinate" value={parseInt(nutritionValues[2])} />
              </Grid>
            </>
          ) : (
            <></>
          )}

        </Grid>

        {/* Add more details as needed */}
      </DialogContent>
    </BottomSheet>
  );
}

export default DishDetail
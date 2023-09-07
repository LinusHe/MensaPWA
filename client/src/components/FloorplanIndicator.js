import React from 'react'
import { Paper, Typography } from '@mui/material';
import theme from '../theme';

function FloorplanIndicator() {
  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: '30px 30px 0 0', boxShadow: '0px -10px 20px 0 rgba(0, 0, 0, 0.1)', backgroundColor: theme.palette.primary.main}}>
        <Typography>
          Sitzplatz
        </Typography>
    </Paper>
  )
}

export default FloorplanIndicator
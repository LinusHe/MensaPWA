import React from 'react';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import PinDropIcon from '@mui/icons-material/PinDrop';
import SettingsIcon from '@mui/icons-material/Settings';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RestaurantIcon from '@mui/icons-material/Restaurant';

// Font imports
import '@fontsource-variable/jost';
import '@fontsource/roboto';


function App() {
  const [value, setValue] = React.useState(0);

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: '30px 30px 0 0', boxShadow: '0px -10px 20px 0 rgba(0, 0, 0, 0.1)' }}>
      <BottomNavigation showLabels
        sx={{ height: 80, backgroundColor: 'unset' }}
        value={value}
        onChange={(event, newValue) => {
          setValue(newValue);
        }} >
        <BottomNavigationAction label="Sitzplatz" icon={<PinDropIcon />} />
        <BottomNavigationAction label="Speiseplan" icon={<RestaurantIcon />} />
        <BottomNavigationAction label="Ansturm" icon={<AccessTimeIcon />} />
        <BottomNavigationAction label="Einstellungen" icon={<SettingsIcon />} />
      </BottomNavigation>
    </Paper>
  );
}

export default App;

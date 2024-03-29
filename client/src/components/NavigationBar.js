import React, { useRef } from 'react'
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import PinDropIcon from '@mui/icons-material/PinDrop';
import SettingsIcon from '@mui/icons-material/Settings';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

function NavigationBar() {
  const navBarRef = useRef(null);
  const [value, setValue] = React.useState(0);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // set Buttom Navigation based on Path
  React.useEffect(() => {
    const height = navBarRef.current?.clientHeight || 0;
    dispatch({ type: 'SET_NAVBAR_HEIGHT', payload: height });

    const pathname = window.location.pathname;
    if (pathname.endsWith("/menu")) {
      setValue("menu");
    } else if (pathname.endsWith("/rush")) {
      setValue("rush");
    } else if (pathname.endsWith("/settings")) {
      setValue("settings");
    } else {
      setValue("home");
    }  
  }, [dispatch]);

  return (
    <Paper ref={navBarRef} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: '30px 30px 0 0', boxShadow: '0px -10px 20px 0 rgba(0, 0, 0, 0.1)' }} style={{padding: "0 0 env(safe-area-inset-bottom) 0"}}>
      <BottomNavigation showLabels
        sx={{ height: 80, backgroundColor: 'unset' }}
        value={value}
        onChange={(event, newValue) => {
          setValue(newValue);
        }} >
        <BottomNavigationAction label="Sitzplatz" value="home" onClick={() => navigate("/")} icon={<PinDropIcon />} />
        <BottomNavigationAction label="Speiseplan" value="menu" onClick={() => navigate("/menu")} icon={<RestaurantIcon />} />
        <BottomNavigationAction label="Ansturm" value="rush" onClick={() => navigate("/rush")} icon={<AccessTimeIcon />} />
        <BottomNavigationAction label="Einstellungen" value="settings" onClick={() => navigate("/settings")} icon={<SettingsIcon />} />
      </BottomNavigation>
    </Paper>
  )
}

export default NavigationBar
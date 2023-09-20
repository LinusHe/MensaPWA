import React from 'react';
import NavigationBar from './components/NavigationBar';
import { Routes, Route } from 'react-router-dom';
import Floorplan from './components/Floorplan';
import FoodMenu from './components/FoodMenu';
import Capacity from './components/Capacity';
import Settings from './components/Settings';
import { SnackbarProvider, closeSnackbar } from 'notistack';
import './assets/App.css';
import Button from '@mui/material/Button';

function App() {
  return (
      <div>
        <SnackbarProvider
          autoHideDuration={5000}
          action={(snackbarId) => (
            <Button variant="text" sx={{ color: 'background.paper' }} onClick={() => closeSnackbar(snackbarId)}>
              Schließen
            </Button>
          )}
        >
          <Routes>
            <Route path="/" element={<Floorplan />} ></Route>
            <Route path="/menu" element={<FoodMenu />} ></Route>
            <Route path="/rush" element={<Capacity />} ></Route>
            <Route path="/settings" element={<Settings />} ></Route>
            <Route path="/:code" element={<Floorplan />} />
          </Routes>
          <NavigationBar></NavigationBar>
        </SnackbarProvider>
      </div>
  );
}

export default App;

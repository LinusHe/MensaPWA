import React from 'react'
import NavigationBar from './components/NavigationBar';
import { Routes, Route } from 'react-router-dom';

import Floorplan from './components/Floorplan';
import FoodMenu from './components/FoodMenu';
import CapacityIndicator from './components/CapacityIndicator';
import Settings from './components/Settings';

function App() {
  return (
    <div>
      <NavigationBar></NavigationBar>
      <Routes>
        <Route path="/" element={<Floorplan />} ></Route>
        <Route path="/menu" element={<FoodMenu />} ></Route>
        <Route path="/rush" element={<CapacityIndicator />} ></Route>
        <Route path="/settings" element={<Settings />} ></Route>
      </Routes>
    </div>
  );
}

export default App;

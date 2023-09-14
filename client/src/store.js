import { configureStore } from '@reduxjs/toolkit';

const initialState = {
  navBarHeight: 0,
  selectedPriceType: localStorage.getItem('selectedPriceType') || 'student', // default value
  notificationsEnabled: JSON.parse(localStorage.getItem('notificationsEnabled')) || false, // default value
  selectedDays: JSON.parse(localStorage.getItem('selectedDays')) || ["Mo", "Di", "Mi", "Do", "Fr"], // default value
  notificationTime: localStorage.getItem('notificationTime') || '11:00', // default value
  appearance: localStorage.getItem('appearance') || 'light' // default value for appearance
};

function reducer(state = initialState, action) {
  switch (action.type) {
    case 'SET_NAVBAR_HEIGHT':
      return { ...state, navBarHeight: action.payload };
    case 'SET_PRICE_TYPE':
      localStorage.setItem('selectedPriceType', action.payload);
      return { ...state, selectedPriceType: action.payload };
    case 'SET_NOTIFICATIONS_ENABLED':
      localStorage.setItem('notificationsEnabled', JSON.stringify(action.payload));
      return { ...state, notificationsEnabled: action.payload };
    case 'SET_SELECTED_DAYS':
      localStorage.setItem('selectedDays', JSON.stringify(action.payload));
      return { ...state, selectedDays: action.payload };
    case 'SET_NOTIFICATION_TIME':
      localStorage.setItem('notificationTime', action.payload);
      return { ...state, notificationTime: action.payload };
    case 'SET_APPEARANCE':
      localStorage.setItem('appearance', action.payload);
      return { ...state, appearance: action.payload };
    default:
      return state;
  }
}

export const store = configureStore({ reducer });
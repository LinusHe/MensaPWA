import { configureStore } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { updateUserData, disableNotification } from './utils/dbController'

const initialState = {
  navBarHeight: 0,
  userId: localStorage.getItem('uniqueId') || uuidv4(), // UUID for notification identification in firebase database
  token: localStorage.getItem('token') || null,
  selectedPriceType: localStorage.getItem('selectedPriceType') || 'student',
  notificationsEnabled: JSON.parse(localStorage.getItem('notificationsEnabled')) || false,
  selectedDays: JSON.parse(localStorage.getItem('selectedDays')) || ["1", "2", "3", "4", "5"],
  notificationTime: localStorage.getItem('notificationTime') || "11:00",
  appearance: localStorage.getItem('appearance') || 'light'
};
// userId, token, selectedDays, notificationTime
function reducer(state = initialState, action) {
  switch (action.type) {
    case 'SET_TOKEN':
      localStorage.setItem('token', action.payload);
      return { ...state, token: action.payload };
    case 'SET_NAVBAR_HEIGHT':
      return { ...state, navBarHeight: action.payload };
    case 'SET_PRICE_TYPE':
      localStorage.setItem('selectedPriceType', action.payload);
      return { ...state, selectedPriceType: action.payload };
    case 'SET_NOTIFICATIONS_ENABLED':
      localStorage.setItem('notificationsEnabled', JSON.stringify(action.payload));
      if (action.payload === true) {
        console.log("Updating db with new notification settings")
        updateUserData(state.userId, state.token, state.selectedDays, state.notificationTime);
      } else if (action.payload === false) {
        disableNotification(state.userId);
      }
      return { ...state, notificationsEnabled: action.payload };
    case 'SET_SELECTED_DAYS':
      localStorage.setItem('selectedDays', JSON.stringify(action.payload));
      if (state.notificationsEnabled === true) {
        console.log("Updating db with new selected days");
        updateUserData(state.userId, state.token, action.payload, state.notificationTime);
      }
      return { ...state, selectedDays: action.payload };
    case 'SET_NOTIFICATION_TIME':
      localStorage.setItem('notificationTime', action.payload);
      if (state.notificationsEnabled === true) {
        console.log("Updating db with new notification time")
        updateUserData(state.userId, state.token, state.selectedDays, action.payload);
      }
      return { ...state, notificationTime: action.payload };
    case 'SET_APPEARANCE':
      localStorage.setItem('appearance', action.payload);
      return { ...state, appearance: action.payload };
    default:
      return state;
  }
}

export const store = configureStore({ reducer });

// Set uniqueId in localStorage if it doesn't already exist
if (!localStorage.getItem('uniqueId')) {
  localStorage.setItem('uniqueId', store.getState().userId);
}

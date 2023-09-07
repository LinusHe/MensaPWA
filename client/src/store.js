import { configureStore } from '@reduxjs/toolkit';

const initialState = {
  navBarHeight: 0
};

function reducer(state = initialState, action) {
  switch (action.type) {
    case 'SET_NAVBAR_HEIGHT':
      return { ...state, navBarHeight: action.payload };
    default:
      return state;
  }
}

export const store = configureStore({ reducer });
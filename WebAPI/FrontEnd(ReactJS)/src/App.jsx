import React from 'react';
import { AppProvider } from './stored/appStore';
import AppRouter from './app/AppRouter';

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

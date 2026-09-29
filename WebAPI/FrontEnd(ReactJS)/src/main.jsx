import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './assets/styles/prototype.css';

// Automatically bridge path-based redirects (e.g. Google OAuth callbacks) into HashRouter
if (typeof window !== 'undefined' && window.location.pathname && window.location.pathname !== '/' && !window.location.hash) {
  const targetPath = window.location.pathname + window.location.search;
  window.location.replace(`/#${targetPath}`);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
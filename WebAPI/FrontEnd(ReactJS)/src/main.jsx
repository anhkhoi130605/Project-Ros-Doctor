import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import LegacyI18nBridge from './i18n/LegacyI18nBridge';
import './assets/styles/prototype.css';
import './assets/styles/button-polish.css';
import './assets/styles/table-polish.css';
import './assets/styles/stat-card-polish.css';
import './assets/styles/session-polish.css';
import './assets/styles/chat-polish.css';

// Automatically bridge path-based redirects (e.g. Google OAuth callbacks) into HashRouter
if (typeof window !== 'undefined' && window.location.pathname && window.location.pathname !== '/' && !window.location.hash) {
  const targetPath = window.location.pathname + window.location.search;
  window.location.replace(`/#${targetPath}`);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <LegacyI18nBridge />
      <App />
    </HashRouter>
  </React.StrictMode>
);

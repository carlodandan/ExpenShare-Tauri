import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './theme.css'
import { getCurrentWindow } from '@tauri-apps/api/window';
import { installApi } from './lib/api.js';

installApi();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);



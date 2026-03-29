import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@adminkit/core/dist/css/app.css';
import './index.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { initThemeFromStorage } from './store/useThemeStore';

initThemeFromStorage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

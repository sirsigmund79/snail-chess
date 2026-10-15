import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import './index.css';
import { applyTheme } from './ui/theme';

applyTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

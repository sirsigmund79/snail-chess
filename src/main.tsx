import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/700.css';
import '@fontsource/figtree/800.css';
import './index.css';
import { applyTheme } from './ui/theme';

applyTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// DA actuelle (remplacer par theme/future/ quand elle sera validée).
import './theme/current/index.css';
import './app.css';
import App from './App.js';

// Thème partagé avec DS-Studio (préférence de l'appareil).
try {
  document.documentElement.classList.toggle(
    'dark',
    (localStorage.getItem('ds-v3-theme') ?? 'dark') === 'dark',
  );
} catch {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

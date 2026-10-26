import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SettingsProvider } from './hooks/settings';
import './styles/base.css';
import './styles/game.css';
import './styles/pages.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
);

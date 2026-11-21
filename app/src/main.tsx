import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { applyTheme, readTheme } from './app/theme';
import { installErrorLog } from './app/version';
import './styles.css';

applyTheme(readTheme());
installErrorLog();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

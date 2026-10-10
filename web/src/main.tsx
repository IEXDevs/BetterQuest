import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SiteShell } from './components/SiteShell';
import { HomePage } from './pages/HomePage';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteShell atmosphere="aurora">
      <HomePage />
    </SiteShell>
  </StrictMode>,
);

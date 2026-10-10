import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SiteShell } from './components/SiteShell';
import { PrivacyPage } from './pages/PrivacyPage';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteShell atmosphere="threads">
      <PrivacyPage />
    </SiteShell>
  </StrictMode>,
);

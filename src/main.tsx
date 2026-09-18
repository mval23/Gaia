import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthGate } from './auth/AuthGate';
import { OutlookProvider } from './integrations/outlook/OutlookProvider';
import { App } from './App';
import './styles/tokens.css';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthGate>
        <OutlookProvider>
          <App />
        </OutlookProvider>
      </AuthGate>
    </BrowserRouter>
  </StrictMode>,
);

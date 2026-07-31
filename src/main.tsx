import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'
import { requestPersistentStorage } from './lib/storageDurability';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Ask the browser to keep her progress rather than treating it as disposable
// cache. Fire-and-forget: unsupported browsers simply say no (Phase 7).
void requestPersistentStorage();

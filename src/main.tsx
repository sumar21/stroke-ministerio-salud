import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { images } from './images';

// Ensure browser tab shows the configured app icon instead of the default globe.
const faviconEl = document.querySelector<HTMLLinkElement>("link[rel='icon']") ?? document.createElement('link');
faviconEl.rel = 'icon';
faviconEl.type = 'image/svg+xml';
faviconEl.href = images.minSaludIcon;

if (!faviconEl.parentNode) {
  document.head.appendChild(faviconEl);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

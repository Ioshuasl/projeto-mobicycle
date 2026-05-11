import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './lib/fetchInterceptor'; // S01: Auto-inject JWT tokens on all API requests
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

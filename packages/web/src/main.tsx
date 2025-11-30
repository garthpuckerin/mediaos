import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

import { AuthProvider } from './contexts/AuthContext';
import AppWrapper from './AppWrapper';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <AppWrapper />
  </AuthProvider>
);

import React from 'react';
import { createRoot } from 'react-dom/client';

import { AuthProvider } from './contexts/AuthContext';
import AppWrapper from './AppWrapper';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <AppWrapper />
  </AuthProvider>
);

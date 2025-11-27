import React from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserMenu } from './components/UserMenu';
import { useApiClient } from './api/client';
import App from './ui/App';

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  background: '#0b0f16',
  borderBottom: '1px solid #1f2937',
  padding: '12px 16px',
  zIndex: 1000,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const logoStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#e5e7eb',
  margin: 0,
};

export default function AppWrapper() {
  // Initialize API client with auth context
  useApiClient();

  return (
    <ProtectedRoute>
      <div style={{ minHeight: '100vh', background: '#0b0f16' }}>
        <header style={headerStyle}>
          <h1 style={logoStyle}>MediaOS</h1>
          <UserMenu />
        </header>
        <App />
      </div>
    </ProtectedRoute>
  );
}

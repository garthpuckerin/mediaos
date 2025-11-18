import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginForm } from './LoginForm';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  color: '#e5e7eb',
  fontSize: '16px',
};

const errorStyle: React.CSSProperties = {
  maxWidth: '400px',
  margin: '100px auto',
  padding: '24px',
  borderRadius: '12px',
  border: '1px solid #7f1d1d',
  background: '#7f1d1d',
  color: '#fecaca',
  textAlign: 'center',
};

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div style={loadingStyle}>Loading...</div>;
  }

  if (!user) {
    return <LoginForm />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return (
      <div style={errorStyle}>
        <h2 style={{ marginTop: 0 }}>Access Denied</h2>
        <p>You need administrator privileges to access this page.</p>
        <button
          onClick={logout}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: '#fee2e2',
            color: '#7f1d1d',
            cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

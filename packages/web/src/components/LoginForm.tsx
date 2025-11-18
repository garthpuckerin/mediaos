import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const containerStyle: React.CSSProperties = {
  maxWidth: '400px',
  margin: '100px auto',
  padding: '24px',
  borderRadius: '12px',
  border: '1px solid #1f2937',
  background: '#111827',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
  marginBottom: '12px',
  fontSize: '14px',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: 'none',
  background: '#3b82f6',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  marginTop: '8px',
};

const errorStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: '8px',
  background: '#7f1d1d',
  color: '#fecaca',
  fontSize: '13px',
  marginBottom: '12px',
};

const linkStyle: React.CSSProperties = {
  color: '#60a5fa',
  cursor: 'pointer',
  textDecoration: 'none',
};

export function LoginForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      setError((err as Error).message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={containerStyle}>
      <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#e5e7eb' }}>
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </h2>

      {error && <div style={errorStyle}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', color: '#9ca3af', fontSize: '13px' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', color: '#9ca3af', fontSize: '13px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {mode === 'register' && (
          <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
            Password must be at least 8 characters long.
            {' '}The first user will automatically become an administrator.
          </p>
        )}

        <button
          type="submit"
          style={{
            ...buttonStyle,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          disabled={loading}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <span
          style={linkStyle}
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </span>
      </p>
    </div>
  );
}

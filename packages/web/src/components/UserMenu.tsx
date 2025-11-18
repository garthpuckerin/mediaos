import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const containerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-block',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
  cursor: 'pointer',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: '8px',
  minWidth: '200px',
  borderRadius: '8px',
  border: '1px solid #1f2937',
  background: '#111827',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
  zIndex: 1000,
};

const menuItemStyle: React.CSSProperties = {
  padding: '10px 12px',
  cursor: 'pointer',
  fontSize: '14px',
  color: '#e5e7eb',
  borderBottom: '1px solid #1f2937',
};

const menuItemHoverStyle: React.CSSProperties = {
  ...menuItemStyle,
  background: '#1f2937',
};

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!user) return null;

  return (
    <div style={containerStyle}>
      <button
        style={buttonStyle}
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      >
        <span style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: user.role === 'admin' ? '#3b82f6' : '#6b7280',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '600',
        }}>
          {user.email[0].toUpperCase()}
        </span>
        <span>{user.email}</span>
        <span style={{ fontSize: '10px', opacity: 0.7 }}>▼</span>
      </button>

      {isOpen && (
        <div style={menuStyle}>
          <div
            style={hoverIndex === 0 ? menuItemHoverStyle : menuItemStyle}
            onMouseEnter={() => setHoverIndex(0)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
              Role
            </div>
            <div style={{ fontWeight: '600' }}>
              {user.role === 'admin' ? 'Administrator' : 'User'}
            </div>
          </div>

          <div
            style={{ ...menuItemStyle, borderBottom: 'none' }}
            onMouseEnter={() => setHoverIndex(1)}
            onMouseLeave={() => setHoverIndex(null)}
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
          >
            <div style={{
              color: '#ef4444',
              fontWeight: '600',
              textAlign: 'center',
            }}>
              Sign Out
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

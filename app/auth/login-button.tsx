// app/auth/login-button.tsx
'use client';

import { useEffect, useState } from 'react';

export default function LoginButton() {
  const [user, setUser] = useState<{ email?: string; name?: string; picture?: string } | null>(null);

  useEffect(() => {
    fetch('https://proud1776ai.com/api/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);

  if (user) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '16px',
        background: '#000',
        color: '#fff',
        borderRadius: '12px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontFamily: 'system-ui, sans-serif'
      }}>
        {user.picture && (
          <img src={user.picture} alt={user.name || 'User'} style={{ width: 36, height: 36, borderRadius: '50%' }} />
        )}
        <span>{user.name || user.email}</span>
        <form action="https://proud1776ai.com/auth/logout" method="get">
          <button type="submit" style={{
            background: 'none',
            border: '1px solid #444',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            Logout
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
      <a
        href="https://proud1776ai.com/auth/login"
        style={{
          display: 'inline-block',
          background: '#000',
          color: '#fff',
          padding: '14px 32px',
          borderRadius: '12px',
          textDecoration: 'none',
          fontWeight: '600',
          fontSize: '18px',
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        Sign in with Google
      </a>
    </div>
  );
}
'use client';
import { useState } from 'react';

export default function LoginButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch('https://proud1776ai.com/api/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    window.location.href = 'https://proud1776ai.com/auth/login';
  };

  const logout = async () => {
    await fetch('https://proud1776ai.com/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
  };

  // Check on mount
  useState(() => {
    fetchUser();
  });

  if (loading) return <div>Loading...</div>;

  return user ? (
    <div style={{ padding: '10px', background: '#eee', borderRadius: '8px' }}>
      <img src={user.picture} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%' }} />
      <span style={{ marginLeft: 10 }}>{user.name || user.email}</span>
      <button onClick={logout} style={{ marginLeft: 10 }}>Logout</button>
    </div>
  ) : (
    <button onClick={login}>Sign in with Google</button>
  );
}
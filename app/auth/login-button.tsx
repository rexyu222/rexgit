// app/auth/login-button.tsx
'use client';
import { useState, useEffect } from 'react';

export default function LoginButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      console.log("Fetching user from backend...");
      const res = await fetch('https://proud1776ai.com/api/me', {
        method: 'GET',
        credentials: 'include',  // This sends the session_id cookie
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        console.log("User loaded:", data);
        setUser(data);
      } else {
        console.log("Not logged in:", res.status);
        setUser(null);
      }
    } catch (err) {
      console.error("Fetch failed:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = () => {
    window.location.href = 'https://proud1776ai.com/auth/login';
  };

  const logout = async () => {
    await fetch('https://proud1776ai.com/auth/logout', {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
    });
    setUser(null);
    window.location.reload();
  };

  if (loading) return <div>Loading user...</div>;

  return user ? (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px', 
      padding: '10px', 
      background: '#f0f0f0', 
      borderRadius: '8px' 
    }}>
      {user.picture && (
        <img 
          src={user.picture} 
          alt="avatar" 
          style={{ width: 40, height: 40, borderRadius: '50%' }} 
        />
      )}
      <span>{user.name || user.email}</span>
      <button onClick={logout}>Logout</button>
    </div>
  ) : (
    <button onClick={login}>Sign in with Google</button>
  );
}
'use client';

import React, { useEffect, useState } from 'react';

type ChatMessage = {
  role: "user" | "bot";
  text: string;
};

type UserInfo = {
  email: string;
  name: string;
  picture: string;
};

export default function Page() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const BACKEND_URL = 'https://proud1776ai.com';

  // Load user on page load
  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) return;

    fetch(`${BACKEND_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.email) setUser(data);
      })
      .catch(console.error);
  }, []);

  // Send chat message
  const sendMessage = async () => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      alert("Please sign in first");
      return;
    }

    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();

    setMessages(prev => [
      ...prev,
      { role: "user", text: prompt },
      { role: "bot", text: data.response }
    ]);

    setPrompt('');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Login / User display */}
      {!user ? (
        <button
          onClick={() => {
            window.location.href = `${BACKEND_URL}/auth/login`;
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Sign in with Google
        </button>
      ) : (
        <div className="flex items-center gap-4">
            <img src={user.picture} alt="avatar" className="w-10 h-10 rounded-full" />
            <span className="font-semibold">{user.name}</span>

            <button
               onClick={() => {
                                localStorage.removeItem('jwt');
                                window.location.reload();
               }}
               className="px-4 py-2 bg-blue-600 text-white rounded"
            >
                 Logout
            </button>
        </div>

      )}

      {/* Chat messages */}
      <div className="space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span className="inline-block p-2 bg-gray-200 rounded">
              {m.text}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          className="flex-1 p-2 border rounded"
          placeholder="Say something..."
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}

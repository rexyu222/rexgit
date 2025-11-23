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
    const text = prompt.trim();
    if (!text) return;

    const token = localStorage.getItem('jwt');

    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ prompt: text }),
    });

    const data = await res.json();

    // Add user + bot messages
    setMessages(prev => [
      ...prev,
      { role: "user", text },
      { role: "bot", text: data.response }
    ]);

    setPrompt('');
  };

  return (
    <div className="h-screen flex flex-col">

      {/* TOP BAR - login/logout in right corner */}
      <div className="w-full flex justify-end p-4 border-b">
        {!user ? (
          <button
            onClick={() => {
              window.location.href = `${BACKEND_URL}/auth/login`;
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
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
              className="px-4 py-2 bg-red-600 text-white rounded-lg"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div
              className={`inline-block px-4 py-2 rounded-2xl ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-black'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* INPUT AREA — TEXTAREA (Enter = new line, Ctrl+Enter = send) */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center w-full bg-gray-100 rounded-3xl px-4 py-2 shadow-sm">

          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => {
              // CTRL + ENTER = send
              if (e.key === "Enter" && e.ctrlKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={1}
            className="flex-1 bg-transparent outline-none text-lg resize-none"
            placeholder="Type your message... (Enter = new line, Ctrl+Enter = send)"
          />

          <button
            onClick={sendMessage}
            className="ml-3 px-4 py-2 bg-green-600 text-white rounded-full"
          >
            Send
          </button>
        </div>
      </div>

    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';

type ChatMessage = {
  role: "user" | "bot";
  text: string;
};

type UserInfo = {
  email: string;
  name: string;
  picture: string;
};

/**
 * Removes:
 * 1) Inline video tags like [VIDEO1 - 0:03:06.440]
 * 2) Everything from "Sources:" to the end of the message
 */
function cleanBotText(text: string) {
  // Remove video references
  let cleaned = text.replace(/\[VIDEO\d+\s*-\s*[^\]]+\]/g, '');

  // Remove "Sources:" section completely
  cleaned = cleaned.replace(/\n\s*Sources:\s*[\s\S]*$/i, '');

  // Remove "**Sources:**" markdown form too
  cleaned = cleaned.replace(/\n\s*\*\*Sources:\*\*\s*[\s\S]*$/i, '');

  return cleaned.trim();
}

/**
 * Message component with hide/show button
 */
function BotMessage({ text }: { text: string }) {
  const [showInfo, setShowInfo] = useState(true);

  const displayText = showInfo ? text : cleanBotText(text);

  return (
    <div className="relative inline-block px-4 py-2 rounded-2xl bg-gray-200 text-black whitespace-pre-wrap">

      {/* MESSAGE BODY */}
      <div>
        {displayText}
      </div>

      {/* TOGGLE BUTTON */}
      <button
        className="absolute bottom-1 right-1 text-xs px-2 py-1 rounded-md bg-black text-white opacity-70 hover:opacity-100"
        onClick={() => setShowInfo(v => !v)}
      >
        {showInfo ? "Hide info" : "Show info"}
      </button>

    </div>
  );
}

export default function Page() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Autosize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [prompt]);

  // Send chat message
  const sendMessage = async () => {
    if (!prompt.trim()) return;

    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();

    setMessages(prev => [
      ...prev,
      { role: "user", text: prompt },
      { role: "bot", text: data.reply }
    ]);

    setPrompt('');

    // Reset textarea to one line
    const el = textareaRef.current;
    if (el) {
      el.style.height = "40px";
    }
  };

  return (
    <div className="h-screen flex flex-col">

      {/* TOP BAR */}
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
            {m.role === 'bot' ? (
              <BotMessage text={m.text} />
            ) : (
              <div className="inline-block px-4 py-2 rounded-2xl whitespace-pre-wrap bg-blue-600 text-white">
                {m.text}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* INPUT AREA */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-end w-full bg-gray-100 rounded-3xl px-4 py-2 shadow-sm">

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Send a message..."
            className="flex-1 bg-transparent outline-none text-lg resize-none overflow-hidden"
            rows={1}
          />

          <button
            onClick={sendMessage}
            className="ml-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
          >
            Send
          </button>
        </div>
      </div>

    </div>
  );
}

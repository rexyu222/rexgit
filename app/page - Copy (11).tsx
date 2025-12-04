// page.tsx (white sidebar + bottom auth button + collapsible like Grok)

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

const VIDEO_URLS: Record<string, string> = {
  Video1: "https://www.youtube.com/watch?v=v6gxmBerTeM",
  Video2: "https://www.youtube.com/watch?v=DDLR5gk6JIE",
};

/* ===== Timestamp parsing ===== */
function parseTimestampCitations(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex =
    /\[([Video1|Video2]+),\s*(\d{1,2}:\d{2}:\d{2}\.\d{3})\]/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, videoKey, timestamp] = match;
    const index = match.index;

    if (index > lastIndex)
      parts.push(text.slice(lastIndex, index));

    const [h, m, s] = timestamp.split(':').map(parseFloat);
    const seconds = h * 3600 + m * 60 + s;

    const url =
      `${VIDEO_URLS[videoKey]}?t=${Math.floor(seconds)}`;

    parts.push(
      <a
        key={index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-1 mx-1 text-xs bg-blue-100 text-blue-700 rounded underline"
      >
        {fullMatch}
      </a>
    );

    lastIndex = index + fullMatch.length;
  }

  if (lastIndex < text.length)
    parts.push(text.slice(lastIndex));

  return parts;
}

function cleanBotText(text: string) {
  return text
    .replace(/\[[Video1|Video2]+,\s*\d{1,2}:\d{2}:\d{2}\.\d{3}\]/g, '')
    .replace(/\n?\*\*Sources:\*\*[\s\S]*/i, '')
    .trim();
}

/* ===== Bot Bubble ===== */
function BotMessage({ text }: { text: string }) {
  const [showInfo, setShowInfo] = useState(true);
  const display = showInfo ? text : cleanBotText(text);

  return (
    <div className="relative bg-gray-200 px-4 py-3 rounded-xl max-w-xl">
      <div className="text-sm space-y-1">
        {parseTimestampCitations(display)}
      </div>

      <button
        onClick={() => setShowInfo(v => !v)}
        className="absolute bottom-1 right-2 text-xs bg-black text-white px-2 py-1 rounded opacity-70 hover:opacity-100"
      >
        {showInfo ? 'Hide info' : 'Show info'}
      </button>
    </div>
  );
}

/* ======================
          Page
====================== */
export default function Page() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const BACKEND_URL = 'https://proud1776ai.com';

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) return;

    fetch(`${BACKEND_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => d.email && setUser(d));
  }, []);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height =
      `${textareaRef.current.scrollHeight}px`;
  }, [prompt]);

  /* ===== Send Message ===== */
  const sendMessage = async () => {
    if (!prompt.trim()) return;

    setMessages(prev => [
      ...prev,
      { role: 'user', text: prompt },
      { role: 'bot', text: '' }
    ]);

    setPrompt('');

    if (textareaRef.current)
      textareaRef.current.style.height = '40px';

    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          `Bearer ${localStorage.getItem('jwt') || ''}`,
      },
      body: JSON.stringify({ prompt }),
    });

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let botText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      botText += decoder.decode(value, { stream: true });

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'bot',
          text: botText
        };
        return updated;
      });
    }
  };

  /* ======================
            Render
====================== */
  return (
    <div className="h-screen flex bg-gray-50">

      {/* ========= Sidebar ========= */}
      <div
        className={`flex flex-col bg-white text-black border-r
        transition-all duration-300
        ${sidebarOpen ? 'w-64' : 'w-14'}`}
      >

        {/* Nav links */}
        <div className="flex-1 p-3 overflow-hidden">
          {sidebarOpen && (
            <>
              
              <div className="space-y-2">
                {['Chat','History'].map(item => (
                  <div
                    key={item}
                    className="cursor-pointer rounded px-3 py-2 hover:bg-gray-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ========= Auth area (BOTTOM) ========= */}
        <div className="border-t px-2 py-3 text-center space-y-2">

          {!user ? (
            sidebarOpen && (
              <button
                onClick={() =>
                  (window.location.href =
                    `${BACKEND_URL}/auth/login`)
                }
                className="w-full px-3 py-2 bg-blue-600
                  text-white rounded-lg hover:bg-blue-700"
              >
                Sign in with Google
              </button>
            )
          ) : (
            sidebarOpen && (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={user.picture}
                  alt="avatar"
                  className="w-10 h-10 rounded-full"
                />

                <span className="font-semibold text-sm">
                  {user.name}
                </span>

                <button
                  onClick={() => {
                    localStorage.removeItem('jwt');
                    window.location.reload();
                  }}
                  className="w-full px-3 py-2 bg-red-600
                    text-white rounded-lg hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            )
          )}

        </div>

        {/* ========= Sidebar Toggle ========= */}
        <button
          onClick={() =>
            setSidebarOpen(open => !open)}
          className="w-full py-3 border-t font-semibold
          hover:bg-gray-100"
        >
          {sidebarOpen ? '<<' : '>>'}
        </button>

      </div>

      {/* ========= Main App ========= */}
      <div className="flex-1 flex flex-col">

        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === 'user'
                  ? 'text-right'
                  : 'text-left'
              }
            >
              {m.role === 'bot'
                ? <BotMessage text={m.text} />
                : (
                  <div className="inline-block bg-blue-600
                    text-white px-4 py-2 rounded-xl">
                    {m.text}
                  </div>
                )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-white">
          <div
            className="flex items-end bg-gray-100
            rounded-3xl p-3"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={prompt}
              onChange={e =>
                setPrompt(e.target.value)}
              onKeyDown={e => {
                if (
                  e.key === 'Enter'
                  && !e.shiftKey
                ) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about jogging or running..."
              className="flex-1 resize-none outline-none
                bg-transparent text-lg"
            />

            <button
              onClick={sendMessage}
              className="ml-3 px-5 py-2 bg-green-600
              text-white rounded-xl hover:bg-green-700"
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

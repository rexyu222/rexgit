// page.tsx (with collapsible left sidebar like Grok)

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

/* === Timestamp Parsing === */
function parseTimestampCitations(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\[([Video1|Video2]+),\s*(\d{1,2}:\d{2}:\d{2}\.\d{3})\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, videoKey, timestamp] = match;
    const index = match.index;

    if (index > lastIndex) parts.push(text.slice(lastIndex, index));

    const [h, m, s] = timestamp.split(':').map(parseFloat);
    const seconds = h * 3600 + m * 60 + s;
    const url = `${VIDEO_URLS[videoKey]}?t=${Math.floor(seconds)}`;

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

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/* === Source Parsing === */
function parseSourceLine(line: string): React.ReactNode {
  const match = line.match(/-\s*\[VIDEO([12])\]\s+(.+?)\s+(https?:\/\/[^\s]+)/i);
  if (!match) return parseTimestampCitations(line);

  const videoNum = match[1];
  const videoKey = `Video${videoNum}`;
  const url = VIDEO_URLS[videoKey];

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-800"
    >
      [VIDEO{videoNum}] {match[2]} {match[3]}
    </a>
  );
}

/* === Text Parser === */
function parseBotText(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.trim().startsWith('**Sources:**'))
      return <div key={i} className="font-bold mt-3">Sources:</div>;

    if (line.trim().startsWith('- [VIDEO'))
      return <div key={i}>{parseSourceLine(line)}</div>;

    return <div key={i}>{parseTimestampCitations(line)}</div>;
  });
}

/* === Clean Text for Hide Info === */
function cleanBotText(text: string) {
  return text
    .replace(/\[[Video1|Video2]+,\s*\d{1,2}:\d{2}:\d{2}\.\d{3}\]/g, '')
    .replace(/\n?\s*\*\*Sources:\*\*[\s\S]*/i, '')
    .trim();
}

/* === Bot Message === */
function BotMessage({ text }: { text: string }) {
  const [showInfo, setShowInfo] = useState(true);
  const displayText = showInfo ? text : cleanBotText(text);

  return (
    <div className="relative bg-gray-200 px-4 py-3 rounded-xl max-w-xl">
      <div className="text-sm space-y-1">
        {parseBotText(displayText)}
      </div>

      <button
        onClick={() => setShowInfo(v => !v)}
        className="absolute bottom-1 right-2 text-xs bg-black text-white px-2 py-1 rounded opacity-70 hover:opacity-100"
      >
        {showInfo ? "Hide info" : "Show info"}
      </button>
    </div>
  );
}

/* =========================
        Page Component
   ========================= */
export default function Page() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const BACKEND_URL = 'https://proud1776ai.com';

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) return;
    fetch(`${BACKEND_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => d.email && setUser(d));
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [prompt]);

  /* === Send Message === */
  const sendMessage = async () => {
    if (!prompt.trim()) return;

    const userMessage = { role: 'user' as const, text: prompt };
    setMessages(prev => [...prev, userMessage, { role: 'bot' as const, text: '' }]);
    setPrompt('');

    if (textareaRef.current)
      textareaRef.current.style.height = '40px';

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('jwt') || ''}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.body) throw new Error("No response");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        botText += decoder.decode(value, { stream: true });

        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "bot", text: botText };
          return copy;
        });
      }
    }
    catch (err) {
      console.error(err);
    }
  };

  /* ===========================
           RENDER
     =========================== */
  return (
    <div className="h-screen flex bg-gray-50">

      {/* === Sidebar === */}
      <div
        className={`relative flex flex-col bg-gray-900 text-white transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-14"
        }`}
      >
        <div className="flex-1 overflow-hidden p-3">

          {sidebarOpen && (
            <>
              <h2 className="text-lg font-bold mb-4">Navigation</h2>
              <div className="space-y-2">
                <div className="hover:bg-gray-700 px-3 py-2 rounded cursor-pointer">Home</div>
                <div className="hover:bg-gray-700 px-3 py-2 rounded cursor-pointer">Chat</div>
                <div className="hover:bg-gray-700 px-3 py-2 rounded cursor-pointer">History</div>
                <div className="hover:bg-gray-700 px-3 py-2 rounded cursor-pointer">Settings</div>
              </div>
            </>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-center text-lg"
        >
          {sidebarOpen ? '<<' : '>>'}
        </button>
      </div>

      {/* === Main App === */}
      <div className="flex-1 flex flex-col">

        {/* Top bar */}
        <div className="flex justify-end p-4 border-b bg-white">
          {!user ? (
            <button
              onClick={() =>
                (window.location.href = `${BACKEND_URL}/auth/login`)
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sign in with Google
            </button>
          ) : (
            <div className="flex gap-3 items-center">
              <img
                src={user.picture}
                className="w-9 h-9 rounded-full"
                alt="avatar"
              />
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

        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === 'user' ? 'text-right' : 'text-left'}
            >
              {m.role === 'bot'
                ? <BotMessage text={m.text} />
                : (
                  <div className="inline-block bg-blue-600 text-white px-4 py-2 rounded-xl">
                    {m.text}
                  </div>
                )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-end bg-gray-100 rounded-3xl p-3">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              placeholder="Ask about jogging or running..."
              className="flex-1 bg-transparent resize-none outline-none text-lg"
            />
            <button
              onClick={sendMessage}
              className="ml-3 px-5 py-2 bg-green-600 text-white rounded-xl"
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

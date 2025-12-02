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

/* === 1. Inline timestamp citations [Video1, 0:03:06.440] === */
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
        key={`ts-${index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-2 py-0.5 mx-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 underline cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          window.open(url, '_blank');
        }}
      >
        {fullMatch}
      </a>
    );

    lastIndex = index + fullMatch.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
}

/* === 2. Make ENTIRE source line clickable (including URL) === */
function parseSourceLine(line: string): React.ReactNode {
  const trimmed = line.trim();

  // Match: - [VIDEO1] Title https://www.youtube.com/watch?v=...
  const match = trimmed.match(/-\s*\[VIDEO([12])\]\s+(.+?)\s+(https?:\/\/[^\s]+)/i);
  if (!match) {
    // Not a source line → just return with possible timestamps
    return parseTimestampCitations(line);
  }

  const videoNum = match[1];
  const titleAndUrl = match[2] + ' ' + match[3]; // full visible text after "- [VIDEOx]"
  const videoKey = `Video${videoNum}`;
  const url = VIDEO_URLS[videoKey];

  return (
    <span>
      -{' '}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800 font-medium"
        onClick={(e) => {
          e.stopPropagation();
          window.open(url, '_blank');
        }}
      >
        [VIDEO{videoNum}] {titleAndUrl}
      </a>
    </span>
  );
}

/* === 3. Main text parser === */
function parseBotText(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim();

    // **Sources:** header
    if (trimmed.match(/\*\*Sources:\*\*/i)) {
      return <div key={i} className="font-bold mt-4 mb-1">{line}</div>;
    }

    // Source line: - [VIDEO1] ...
    if (trimmed.startsWith('- [VIDEO')) {
      return <div key={i}>{parseSourceLine(line)}</div>;
    }

    // Normal line (with possible timestamps)
    return (
      <div key={i}>
        {parseTimestampCitations(line)}
        {i < text.split('\n').length - 1 && <br />}
      </div>
    );
  });
}

/* === 4. Clean text for "Hide info" === */
function cleanBotText(text: string): string {
  return text
    .replace(/\[[Video1|Video2]+,\s*\d{1,2}:\d{2}:\d{2}\.\d{3}\]/g, '')
    .replace(/\n?\s*\*\*Sources:\*\*[\s\S]*/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* === Bot Message === */
function BotMessage({ text }: { text: string }) {
  const [showInfo, setShowInfo] = useState(true);
  const displayText = showInfo ? text : cleanBotText(text);

  return (
    <div className="relative inline-block max-w-full px-5 py-3 rounded-2xl bg-gray-200 text-black whitespace-pre-wrap break-words">
      <div className="space-y-1 text-sm leading-relaxed">
        {parseBotText(displayText)}
      </div>

      <button
        onClick={() => setShowInfo(v => !v)}
        className="absolute bottom-1 right-2 text-xs px-2 py-1 rounded bg-black text-white opacity-70 hover:opacity-100 transition"
      >
        {showInfo ? "Hide info" : "Show info"}
      </button>
    </div>
  );
}

/* === Page Component === */
export default function Page() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const BACKEND_URL = 'https://proud1776ai.com';

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) return;
    fetch(`${BACKEND_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => d.email && setUser(d));
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [prompt]);

  const sendMessage = async () => {
    if (!prompt.trim()) return;
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();

    setMessages(prev => [...prev, { role: 'user', text: prompt }, { role: 'bot', text: data.reply }]);
    setPrompt('');
    if (textareaRef.current) textareaRef.current.style.height = '40px';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="w-full flex justify-end p-4 border-b bg-white">
        {!user ? (
          <button onClick={() => { window.location.href = `${BACKEND_URL}/auth/login`; }} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Sign in with Google
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <img src={user.picture} alt="avatar" className="w-10 h-10 rounded-full" />
            <span className="font-semibold">{user.name}</span>
            <button onClick={() => { localStorage.removeItem('jwt'); window.location.reload(); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Logout
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            {m.role === 'bot' ? <BotMessage text={m.text} /> : (
              <div className="inline-block px-5 py-3 rounded-2xl bg-blue-600 text-white max-w-lg whitespace-pre-wrap">
                {m.text}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t bg-white">
        <div className="flex items-end w-full bg-gray-100 rounded-3xl px-4 py-3 shadow-sm">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about jogging or running..."
            className="flex-1 bg-transparent outline-none text-lg resize-none overflow-hidden"
            rows={1}
          />
          <button onClick={sendMessage} className="ml-3 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
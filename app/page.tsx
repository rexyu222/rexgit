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

/**
 * Parses [Video1, 0:03:06.440] → clickable <a> that opens YouTube at that time
 */
function parseCitations(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\[([Video1|Video2]+),\s*(\d{1,2}:\d{2}:\d{2}\.\d{3})\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, videoKey, timestamp] = match;
    const index = match.index;

    // Text before the citation
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    // Convert timestamp 0:03:06.440 → seconds
    const timeParts = timestamp.split(':');
    const seconds =
      parseInt(timeParts[0]) * 3600 +
      parseInt(timeParts[1]) * 60 +
      parseFloat(timeParts[2]);

    const url = `${VIDEO_URLS[videoKey]}?t=${Math.floor(seconds)}`;

    parts.push(
      <a
        key={index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-2 py-0.5 mx-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200 underline"
        onClick={(e) => {
          e.stopPropagation(); // prevent chat bubble click issues
          window.open(url, '_blank');
        }}
      >
        {fullMatch}
      </a>
    );

    lastIndex = index + fullMatch.length;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Cleans bot text when "Hide info" is active
 */
function cleanBotText(text: string) {
  let cleaned = text;

  // Remove all [Video1, ...], [Video2, ...] citations
  cleaned = cleaned.replace(/\[[Video1|Video2]+,?\s*\d{1,2}:\d{2}:\d{2}\.\d{3}\]/g, '');

  // Remove Sources block at the end
  cleaned = cleaned.replace(/\n\s*\*\*Sources:\*\*[\s\S]*/i, '');
  cleaned = cleaned.replace(/\n\s*Sources:[\s\S]*/i, '');

  // Clean up extra spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return cleaned;
}

/**
 * Bot message with clickable timestamps + show/hide */
function BotMessage({ text }: { text: string }) {
  const [showInfo, setShowInfo] = useState(true);
  const displayText = showInfo ? text : cleanBotText(text);

  // Split by lines to preserve <br/> or paragraphs
  const lines = displayText.split('\n');

  return (
    <div className="relative inline-block max-w-full px-4 py-3 rounded-2xl bg-gray-200 text-black whitespace-pre-wrap break-words">
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i}>
            {parseCitations(line)}
            {i < lines.length - 1 && <br />}
          </div>
        ))}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setShowInfo(v => !v)}
        className="absolute bottom-1 right-2 text-xs px-2 py-1 rounded bg-black text-white opacity-70 hover:opacity-100 transition"
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

  // Load user
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
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [prompt]);

  // Send message
  const sendMessage = async () => {
    if (!prompt.trim()) return;

    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();

    setMessages(prev => [
      ...prev,
      { role: "user", text: prompt },
      { role: "bot", text: data.reply }
    ]);

    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">

      {/* TOP BAR */}
      <div className="w-full flex justify-end p-4 border-b bg-white">
        {!user ? (
          <button
            onClick={() => { window.location.href = `${BACKEND_URL}/auth/login`; }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* CHAT MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            {m.role === 'bot' ? (
              <BotMessage text={m.text} />
            ) : (
              <div className="inline-block px-5 py-3 rounded-2xl bg-blue-600 text-white max-w-lg whitespace-pre-wrap">
                {m.text}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-end w-full bg-gray-100 rounded-3xl px-4 py-3 shadow-sm">
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
            placeholder="Ask about jogging or running..."
            className="flex-1 bg-transparent outline-none text-lg resize-none overflow-hidden"
            rows={1}
          />
          <button
            onClick={sendMessage}
            className="ml-3 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
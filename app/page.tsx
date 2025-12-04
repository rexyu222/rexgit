// page.tsx (white sidebar + history + bottom auth button + collapsible)
// Updated: regex fix + safer fetch + defensive guards

'use client';

import React, { useEffect, useRef, useState } from 'react';

type ChatMessage = {
  role: 'user' | 'bot';
  text: string;
};

type UserInfo = {
  email: string;
  name: string;
  picture: string;
};

type HistoryItem = {
  question: string;
  answer?: string; // answer optional to be defensive
};

/* ======================
	   VIDEO LINKS
====================== */

const VIDEO_URLS: Record<string, string> = {
  Video1: 'https://www.youtube.com/watch?v=v6gxmBerTeM',
  Video2: 'https://www.youtube.com/watch?v=DDLR5gk6JIE',
};

/* ======================
   Timestamp parsing
====================== */

// NOTE: regex fixed: use a capture group (Video1|Video2) not a character class
const TIMESTAMP_REGEX = /\[(Video1|Video2),\s*(\d{1,2}:\d{2}:\d{2}\.\d{3})\]/g;

function parseTimestampCitations(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  if (!text) return parts;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  TIMESTAMP_REGEX.lastIndex = 0; // reset stateful regex
  while ((match = TIMESTAMP_REGEX.exec(text)) !== null) {
    const fullMatch = match[0];
    const videoKey = match[1];
    const timestamp = match[2];
    const index = match.index;

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    // safe parse of timestamp
    const segs = timestamp.split(':');
    const h = parseFloat(segs[0] || '0');
    const m = parseFloat(segs[1] || '0');
    const s = parseFloat(segs[2] || '0');
    const seconds = h * 3600 + m * 60 + s;

    const url = `${VIDEO_URLS[videoKey] || '#'}?t=${Math.floor(seconds)}`;

    parts.push(
      <a
        key={`${index}-${videoKey}`}
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

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function cleanBotText(text: string) {
  if (!text) return '';
  // same regex correction here: use capture-group style for replacement
  return text
    .replace(/\[(Video1|Video2),\s*\d{1,2}:\d{2}:\d{2}\.\d{3}\]/g, '')
    .replace(/\n?\*\*Sources:\*\*[\s\S]*/i, '')
    .trim();
}

/* ======================
     Bot Bubble
====================== */

function BotMessage({ text }: { text: string }) {
  const [showInfo, setShowInfo] = useState(true);
  const display = showInfo ? text : cleanBotText(text);

  return (
    <div className="relative bg-gray-200 px-4 py-3 rounded-xl max-w-xl">
      <div className="text-sm space-y-1">{parseTimestampCitations(display)}</div>

      <button
        onClick={() => setShowInfo((v) => !v)}
        className="absolute bottom-1 right-2 text-xs bg-black text-white px-2 py-1 rounded"
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
  const BACKEND_URL = 'https://proud1776ai.com';

  const [user, setUser] = useState<UserInfo | null>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /* ======================
       Load user data
  ====================== */

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) return;

    (async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return; // don't throw; keep user null
        const d = await r.json();
        if (d && d.email) setUser(d as UserInfo);
      } catch (err) {
        // swallow, but log for debugging in console
        // eslint-disable-next-line no-console
        console.error('fetch /api/me error', err);
      }
    })();
  }, []);

  /* ======================
     Load History
  ====================== */

  useEffect(() => {
    if (!user) return;

    (async () => {
      const token = localStorage.getItem('jwt');
      try {
        const res = await fetch(`${BACKEND_URL}/api/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          // eslint-disable-next-line no-console
          console.warn('/api/history returned', res.status);
          return;
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
          // eslint-disable-next-line no-console
          console.warn('unexpected /api/history payload', data);
          return;
        }
        // normalize each item defensively
        const normalized: HistoryItem[] = data.map((it: any) => {
          if (typeof it === 'string') return { question: it, answer: '' };
          return {
            question: it.question ?? String(it.q ?? ''),
            answer: it.answer ?? it.reply ?? '',
          };
        });
        setHistory(normalized);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('fetch /api/history error', err);
      }
    })();
  }, [user]);

  /* ======================
   Auto-grow textarea
  ====================== */

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [prompt]);

  /* ======================
        Send Chat
  ====================== */

  const sendMessage = async () => {
    if (!prompt.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', text: prompt }, { role: 'bot', text: '' }]);

    setPrompt('');
    if (textareaRef.current) textareaRef.current.style.height = '40px';

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('jwt') || ''}`,
        },
        body: JSON.stringify({ prompt }),
      });

      // If server didn't return streaming body, fall back to full-text read
      if (!res.body) {
        const full = await res.text();
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'bot', text: full };
          return updated;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let botText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        botText += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const updated = [...prev];
          // defensive: ensure there is at least one element to replace
          if (updated.length === 0) updated.push({ role: 'bot', text: botText });
          else updated[updated.length - 1] = { role: 'bot', text: botText };
          return updated;
        });
      }
    } catch (err) {
      // show error message as bot text so user isn't left with blank space
      const errMsg = `Error: ${(err as Error).message || 'network error'}`;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'bot', text: errMsg };
        return updated;
      });
      // eslint-disable-next-line no-console
      console.error('sendMessage error', err);
    }
  };

  /* ======================
        Load History Chat
  ====================== */

  const loadHistoryChat = (item: HistoryItem) => {
    if (!item) return;
    setMessages([
      { role: 'user', text: item.question ?? '' },
      { role: 'bot', text: item.answer ?? '' },
    ]);
    setPrompt('');
  };

  /* ======================
         Render
  ====================== */

  return (
    <div className="h-screen flex bg-gray-50">
      {/* ========= Sidebar ========= */}
      <div
        className={`flex flex-col bg-white text-black border-r transition-all duration-300 
        ${sidebarOpen ? 'w-64' : 'w-14'}`}
      >
        <div className="flex-1 p-3 overflow-hidden">
          {sidebarOpen && (
            <>
              <div className="space-y-2">
                {/* MAIN TABS */}
                <div className="rounded px-3 py-2 bg-gray-100 font-semibold">Chat</div>

                {/* HISTORY */}
                <div className="mt-4">
                  <div className="font-semibold mb-2">History</div>

                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {history.length === 0 && <div className="text-xs text-gray-400">No history yet</div>}

                    {history.map((h, i) => (
                      <div
                        key={`hist-${i}`}
                        className="cursor-pointer text-sm px-2 py-1 rounded hover:bg-gray-200 truncate"
                        onClick={() => loadHistoryChat(h)}
                        title={h.question}
                      >
                        {h.question}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ========= AUTH (BOTTOM) ========= */}
        <div className="border-t px-2 py-3 text-center space-y-2">
          {!user ? (
            sidebarOpen && (
              <button
                onClick={() => (window.location.href = `${BACKEND_URL}/auth/login`)}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sign in with Google
              </button>
            )
          ) : (
            sidebarOpen && (
              <div className="flex flex-col items-center gap-2">
                <img src={user.picture} alt="avatar" className="w-10 h-10 rounded-full" />
                <span className="font-semibold text-sm">{user.name}</span>

                <button
                  onClick={() => {
                    localStorage.removeItem('jwt');
                    window.location.reload();
                  }}
                  className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            )
          )}
        </div>

        {/* ========= COLLAPSE TOGGLE ========= */}
        <button onClick={() => setSidebarOpen((s) => !s)} className="w-full py-3 border-t font-semibold hover:bg-gray-100">
          {sidebarOpen ? '<<' : '>>'}
        </button>
      </div>

      {/* ========= MAIN CHAT ========= */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={`msg-${i}`} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              {m.role === 'bot' ? (
                <BotMessage text={m.text} />
              ) : (
                <div className="inline-block bg-blue-600 text-white px-4 py-2 rounded-xl">{m.text}</div>
              )}
            </div>
          ))}
        </div>

        {/* ========= INPUT ========= */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-end bg-gray-100 rounded-3xl p-3">
            <textarea
              ref={textareaRef}
              rows={1}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about jogging or running..."
              className="flex-1 resize-none outline-none bg-transparent text-lg"
            />

            <button onClick={sendMessage} className="ml-3 px-5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

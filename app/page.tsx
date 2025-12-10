'use client';
import React, { useEffect, useRef, useState } from 'react';

type ChatMessage = {
  role: 'user' | 'bot';
  text: string;
};

type HistoryItem = {
  question: string;
  answer: string;
  session_id: string;
  createdTime: string;
};

type SessionGroup = {
  session_id: string;
  title: string;
  messages: ChatMessage[];
  createdTime: string;
};

const BACKEND_URL = 'https://proud1776ai.com';

type UserInfo = {
  email: string;
  name: string;
  picture: string;
};

/* ====================== VIDEO PARSING ====================== */
const VIDEO_URLS: Record<string, string> = {
  Video1: 'https://www.youtube.com/watch?v=v6gxmBerTeM',
  Video2: 'https://www.youtube.com/watch?v=DDLR5gk6JIE',
};

const TIMESTAMP_REGEX = /\[(Video1|Video2),\s*(\d{1,2}:\d{2}:\d{2}\.\d{3})\]/g;

function parseTimestampCitations(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  if (!text) return parts;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TIMESTAMP_REGEX.exec(text)) !== null) {
    const videoKey = match[1];
    const timestamp = match[2];
    const index = match.index;

    if (index > lastIndex) parts.push(text.slice(lastIndex, index));

    const [h, m, s] = timestamp.split(':').map(parseFloat);
    const seconds = h * 3600 + m * 60 + s;
    const url = `${VIDEO_URLS[videoKey] || '#'}?t=${Math.floor(seconds)}`;

    parts.push(
      <a
        key={index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-1 mx-1 text-xs bg-blue-100 text-blue-700 rounded underline"
      >
        [{videoKey}, {timestamp}]
      </a>
    );

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return parts;
}

function cleanBotText(text: string) {
  if (!text) return '';
  return text
    .replace(/\[(Video1|Video2),\s*\d{1,2}:\d{2}:\d{2}\.\d{3}\]/g, '')
    .replace(/\n?\*\*Sources:\*\*[\s\S]*/i, '')
    .trim();
}

function BotMessage({ text }: { text: string }) {
  const [showInfo, setShowInfo] = useState(true);
  const display = showInfo ? text : cleanBotText(text);

  return (
    <div className="relative bg-gray-200 px-4 py-3 rounded-xl w-full max-w-4xl">
      <div className="text-sm space-y-1">
        {parseTimestampCitations(display)}
      </div>

      <button
        onClick={() => setShowInfo(v => !v)}
        className="absolute bottom-1 right-2 text-xs bg-black text-white px-2 py-1 rounded"
      >
        {showInfo ? 'Hide info' : 'Show info'}
      </button>
    </div>
  );
}

/* ====================== MAIN PAGE ====================== */

export default function Page() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /* ✅ NEW: Sidebar Resize */
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const isResizing = useRef(false);

  /* ✅ NEW: Auto-hide Input Bar */
  const [showInput, setShowInput] = useState(true);

  /* ---------------- SIDEBAR RESIZE ---------------- */
  const startResize = () => {
    isResizing.current = true;
  };

  const stopResize = () => {
    isResizing.current = false;
  };

  const resize = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = Math.max(80, Math.min(420, e.clientX));
    setSidebarWidth(newWidth);
  };

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResize);

    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, []);

  /* ---------------- AUTO-HIDE INPUT BAR ---------------- */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const bottomOffset = window.innerHeight - 120;
      setShowInput(e.clientY >= bottomOffset);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () =>
      window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  /* ---------------- USER LOAD ---------------- */
  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) return;

    fetch(`${BACKEND_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => data.email && setUser(data))
      .catch(console.error);
  }, []);

  /* ---------------- HISTORY LOAD ---------------- */
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('jwt');

    fetch(`${BACKEND_URL}/api/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;

        const items: HistoryItem[] = data.map(item => ({
          question: item.question?.S ?? item.question ?? '',
          answer: item.answer?.S ?? item.answer ?? '',
          session_id: item.session_id?.S ?? item.session_id ?? '',
          createdTime: item.createdTime?.S ?? item.createdTime ?? '',
        }));

        const groups = new Map<string, SessionGroup>();

        items.forEach(item => {
          if (!groups.has(item.session_id)) {
            groups.set(item.session_id, {
              session_id: item.session_id,
              title: item.question || '(no title)',
              messages: [],
              createdTime: item.createdTime,
            });
          }

          const group = groups.get(item.session_id)!;
          group.messages.push({ role: 'user', text: item.question });
          if (item.answer)
            group.messages.push({ role: 'bot', text: item.answer });
        });

        const sortedGroups = Array.from(groups.values()).sort(
          (a, b) => b.createdTime.localeCompare(a.createdTime)
        );

        setSessionGroups(sortedGroups);
        setHistoryItems(items);
      })
      .catch(console.error);
  }, [user]);

  /* ---------------- TEXTAREA AUTO SIZE ---------------- */
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height =
      textareaRef.current.scrollHeight + 'px';
  }, [prompt]);

  /* ---------------- SEND MESSAGE ---------------- */
  const sendMessage = async () => {
    if (!prompt.trim()) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: prompt.trim(),
    };

    setMessages(prev => [
      ...prev,
      userMsg,
      { role: 'bot', text: '' },
    ]);

    setPrompt('');

    if (textareaRef.current)
      textareaRef.current.style.height = '40px';

    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${
          localStorage.getItem('jwt') || ''
        }`,
      },
      body: JSON.stringify({
        prompt: userMsg.text,
        session_id: sessionId || undefined,
      }),
    });

    let currentSessionId = sessionId;
    const headerSessionId = res.headers.get('X-Session-ID');

    if (headerSessionId && !currentSessionId) {
      currentSessionId = headerSessionId;
      setSessionId(headerSessionId);
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let fullAnswer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      fullAnswer += decoder.decode(value, { stream: true });

      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: 'bot',
          text: fullAnswer,
        };
        return copy;
      });
    }
  };

  const loadSession = (group: SessionGroup) => {
    setMessages(group.messages);
    setSessionId(group.session_id);
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setPrompt('');
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* SIDEBAR */}
      <div
        style={{ width: sidebarOpen ? sidebarWidth : 56 }}
        className="relative flex flex-col bg-white border-r"
      >
        <div className="flex-1 p-3 overflow-hidden">
          {sidebarOpen && (
            <>
              <button
                onClick={startNewChat}
                className="w-full rounded px-3 py-2 bg-gray-100 hover:bg-gray-200 mb-4"
              >
                + New Chat
              </button>

              <div className="text-sm font-semibold mb-2">
                History
              </div>

              <div className="space-y-1 max-h-96 overflow-y-auto">
                {sessionGroups.map(group => (
                  <div
                    key={group.session_id}
                    onClick={() => loadSession(group)}
                    className={`cursor-pointer px-3 py-2 rounded text-sm truncate hover:bg-gray-200 ${
                      sessionId === group.session_id
                        ? 'bg-gray-200 font-medium'
                        : ''
                    }`}
                  >
                    {group.title}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="border-t py-3 hover:bg-gray-100"
        >
          {sidebarOpen ? '<<' : '>>'}
        </button>

        {/* ✅ RESIZE HANDLE */}
        <div
          onMouseDown={startResize}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-300"
        />
      </div>

      {/* CHAT */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col items-center">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === 'user'
                  ? 'text-right'
                  : 'text-left'
              }
            >
              {m.role === 'bot' ? (
                <BotMessage text={m.text} />
              ) : (
                <div className="inline-block bg-blue-600 text-white px-5 py-3 rounded-2xl w-full max-w-4xl">
                  {m.text}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ✅ AUTO-HIDE INPUT BAR */}
        <div
          className={`p-4 border-t bg-white transition-transform duration-300 ${
            showInput
              ? 'translate-y-0'
              : 'translate-y-full'
          }`}
        >
          <div className="flex items-end bg-gray-100 rounded-3xl p-3">
            <textarea
              ref={textareaRef}
              rows={1}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent resize-none outline-none text-lg"
            />

            <button
              onClick={sendMessage}
              className="ml-3 px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

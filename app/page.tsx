// page.tsx - Updated with proper session grouping + chronological ordering
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
  createdTime: string; // ISO string or timestamp
};

type SessionGroup = {
  session_id: string;
  title: string; // oldest question
  messages: ChatMessage[];
  createdTime: string; // for sorting sessions if needed
};

const BACKEND_URL = 'https://proud1776ai.com';
type UserInfo = { email: string; name: string; picture: string };

/* ======================
   VIDEO LINKS & PARSING (unchanged)
====================== */
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
  TIMESTAMP_REGEX.lastIndex = 0;
  while ((match = TIMESTAMP_REGEX.exec(text)) !== null) {
    const fullMatch = match[0];
    const videoKey = match[1];
    const timestamp = match[2];
    const index = match.index;
    if (index > lastIndex) parts.push(text.slice(lastIndex, index));

    const [h, m, s] = timestamp.split(':').map(parseFloat);
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
    <div className="relative bg-gray-200 px-4 py-3 rounded-xl max-w-xl">
      <div className="text-sm space-y-1">{parseTimestampCitations(display)}</div>
      <button
        onClick={() => setShowInfo(v => !v)}
        className="absolute bottom-1 right-2 text-xs bg-black text-white px-2 py-1 rounded"
      >
        {showInfo ? 'Hide info' : 'Show info'}
      </button>
    </div>
  );
}

/* ======================
   Main Page Component
====================== */
export default function Page() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /* Load User */
  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) return;
    fetch(`${BACKEND_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => d.email && setUser(d))
      .catch(console.error);
  }, []);

  /* Load Full History & Group by session_id */
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('jwt');
    fetch(`${BACKEND_URL}/api/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;

        const items: HistoryItem[] = data.map((item: any) => ({
          question: item.question?.S ?? item.question ?? '',
          answer: item.answer?.S ?? item.answer ?? '',
          session_id: item.session_id?.S ?? item.session_id ?? '',
          createdTime: item.createdTime?.S ?? item.createdTime ?? '',
        }));

        setHistoryItems(items);

        // Group by session_id and pick oldest question as title
        const groups = new Map<string, SessionGroup>();

        items.forEach(item => {
          const { session_id, question, answer, createdTime } = item;
          if (!session_id) return;

          if (!groups.has(session_id)) {
            groups.set(session_id, {
              session_id,
              title: question || '(empty)',
              messages: [],
              createdTime,
            });
          }

          const group = groups.get(session_id)!;

          // Update title to oldest question
          if (createdTime < group.createdTime || !group.createdTime) {
            group.title = question || '(empty)';
            group.createdTime = createdTime;
          }

          // Add Q&A pair in chronological order later
          group.messages.push({ role: 'user', text: question });
          if (answer) {
            group.messages.push({ role: 'bot', text: answer });
          }
        });

        // Sort messages inside each session by createdTime
        groups.forEach(group => {
          const sortedWithTime = items
            .filter(i => i.session_id === group.session_id)
            .sort((a, b) => a.createdTime.localeCompare(b.createdTime));

          group.messages = [];
          sortedWithTime.forEach(i => {
            group.messages.push({ role: 'user', text: i.question });
            if (i.answer) group.messages.push({ role: 'bot', text: i.answer });
          });
        });

        // Optional: sort sessions by oldest message (most recent session on top)
        const sortedGroups = Array.from(groups.values()).sort((a, b) =>
          b.createdTime.localeCompare(a.createdTime)
        );

        setSessionGroups(sortedGroups);
      })
      .catch(console.error);
  }, [user]);

  /* Auto-resize textarea */
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [prompt]);

  /* Send Message */
  const sendMessage = async () => {
    if (!prompt.trim()) return;

    const userMessage: ChatMessage = { role: 'user', text: prompt };
    setMessages(prev => [...prev, userMessage, { role: 'bot', text: '' }]);
    setPrompt('');
    if (textareaRef.current) textareaRef.current.style.height = '40px';

    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('jwt') || ''}`,
      },
      body: JSON.stringify({ prompt, session_id: sessionId }),
    });

    const newSessionId = res.headers.get('X-Session-ID');
    if (newSessionId && !sessionId) {
      setSessionId(newSessionId);
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let botText = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      botText += decoder.decode(value, { stream: true });
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'bot', text: botText };
        return copy;
      });
    }
  };

  /* Load full session when clicking history item */
  const loadSession = (group: SessionGroup) => {
    setMessages(group.messages);
    setSessionId(group.session_id);
    setPrompt('');
  };

  /* New Chat */
  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setPrompt('');
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* SIDEBAR */}
      <div
        className={`flex flex-col bg-white text-black border-r transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-14'
        }`}
      >
        <div className="flex-1 p-3 overflow-hidden">
          {sidebarOpen && (
            <>
              <button
                onClick={startNewChat}
                className="w-full rounded px-3 py-2 bg-gray-100 font-semibold text-left hover:bg-gray-200"
              >
                New Chat
              </button>

              <div className="mt-6">
                <div className="font-semibold mb-2 text-sm">History</div>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {sessionGroups.length === 0 ? (
                    <div className="text-xs text-gray-400">No history yet</div>
                  ) : (
                    sessionGroups.map(group => (
                      <div
                        key={group.session_id}
                        onClick={() => loadSession(group)}
                        className={`cursor-pointer text-sm px-3 py-2 rounded hover:bg-gray-200 truncate ${
                          sessionId === group.session_id ? 'bg-gray-200 font-medium' : ''
                        }`}
                        title={group.title}
                      >
                        {group.title || '(no title)'}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* AUTH SECTION */}
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

        {/* TOGGLE */}
        <button
          onClick={() => setSidebarOpen(s => !s)}
          className="w-full py-3 border-t font-semibold hover:bg-gray-100"
        >
          {sidebarOpen ? '<<' : '>>'}
        </button>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              Start a new conversation or select one from history
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={m.role === 'user' ? 'text-right' : 'text-left'}
              >
                {m.role === 'bot' ? (
                  <BotMessage text={m.text} />
                ) : (
                  <div className="inline-block bg-blue-600 text-white px-4 py-3 rounded-xl max-w-2xl">
                    {m.text}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* INPUT */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-end bg-gray-100 rounded-100 rounded-3xl p-3">
            <textarea
              ref={textareaRef}
              rows={1}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about jogging or running..."
              className="flex-1 resize-none outline-none bg-transparent text-lg"
            />
            <button
              onClick={sendMessage}
              className="ml-3 px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
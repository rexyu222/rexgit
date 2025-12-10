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

/* ====================== MAIN PAGE ====================== */
export default function Page() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null); // ← Fixed!
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(260); // default ~w-64
  const isResizing = useRef(false);

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

  /* Load user */
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

  /* Load & group history */
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('jwt');

    fetch(`${BACKEND_URL}/api/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;

        const items: HistoryItem[] = data
          .map(item => ({
            question: item.question?.S ?? item.question ?? '',
            answer: item.answer?.S ?? item.answer ?? '',
            session_id: item.session_id?.S ?? item.session_id ?? '',
            createdTime: item.createdTime?.S ?? item.createdTime ?? '',
          }))
          .filter(i => i.session_id && i.createdTime);

        setHistoryItems(items);

        const groups = new Map<string, SessionGroup>();

        items.forEach(item => {
          const { session_id, question, answer, createdTime } = item;

          if (!groups.has(session_id)) {
            groups.set(session_id, {
              session_id,
              title: question || '(no title)',
              messages: [],
              createdTime,
            });
          }

          const group = groups.get(session_id)!;

          if (!group.createdTime || createdTime < group.createdTime) {
            group.title = question || '(no title)';
            group.createdTime = createdTime;
          }

          group.messages.push({ role: 'user', text: question });
          if (answer) group.messages.push({ role: 'bot', text: answer });
        });

        // Sort messages inside each session
        groups.forEach(group => {
          const sorted = items
            .filter(i => i.session_id === group.session_id)
            .sort((a, b) => a.createdTime.localeCompare(b.createdTime));

          group.messages = [];
          sorted.forEach(i => {
            group.messages.push({ role: 'user', text: i.question });
            if (i.answer) group.messages.push({ role: 'bot', text: i.answer });
          });
        });

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

  /* Send message */
  const sendMessage = async () => {
    if (!prompt.trim()) return;

    const userQuestion = prompt.trim();
    const userMsg: ChatMessage = { role: 'user', text: userQuestion };

    setMessages(prev => [...prev, userMsg, { role: 'bot', text: '' }]);
    setPrompt('');
    if (textareaRef.current) textareaRef.current.style.height = '40px';

    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('jwt') || ''}`,
      },
      body: JSON.stringify({
        prompt: userQuestion,
        session_id: sessionId || undefined, // ← safe for null handling
      }),
    });

    let currentSessionId = sessionId;
    const headerSessionId = res.headers.get('X-Session-ID');
    if (headerSessionId && !currentSessionId) {
      currentSessionId = headerSessionId;
      setSessionId(currentSessionId);
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
        copy[copy.length - 1] = { role: 'bot', text: fullAnswer };
        return copy;
      });
    }

    // Permanently save new Q&A to history
    const newItem: HistoryItem = {
      question: userQuestion,
      answer: fullAnswer,
      session_id: currentSessionId || `temp-${Date.now()}`,
      createdTime: new Date().toISOString(),
    };

    setHistoryItems(prev => [...prev, newItem]);

    setSessionGroups(prev => {
      const map = new Map(prev.map(g => [g.session_id, g]));
      const sid = currentSessionId || newItem.session_id;

      if (!map.has(sid)) {
        map.set(sid, {
          session_id: sid,
          title: userQuestion,
          messages: [],
          createdTime: newItem.createdTime,
        });
      }

      const group = map.get(sid)!;
      if (!group.createdTime || newItem.createdTime < group.createdTime) {
        group.title = userQuestion;
        group.createdTime = newItem.createdTime;
      }

      group.messages.push({ role: 'user', text: userQuestion });
      group.messages.push({ role: 'bot', text: fullAnswer });

      return Array.from(map.values()).sort((a, b) =>
        b.createdTime.localeCompare(a.createdTime)
      );
    });
  };

  const loadSession = (group: SessionGroup) => {
    setMessages(group.messages);
    setSessionId(group.session_id);
    setPrompt('');
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
           className="relative flex flex-col bg-white border-r transition-all"
      >

        <div className="flex-1 p-3 overflow-hidden">
          {sidebarOpen && (
            <>
              <button
                onClick={startNewChat}
                className="w-full rounded px-3 py-2 bg-gray-100 font-semibold text-left hover:bg-gray-200 mb-4"
              >
                + New Chat
              </button>

              <div className="text-sm font-semibold mb-2">History</div>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {sessionGroups.length === 0 ? (
                  <div className="text-xs text-gray-400">No history yet</div>
                ) : (
                  sessionGroups.map(group => (
                    <div
                      key={group.session_id}
                      onClick={() => loadSession(group)}
                      className={`cursor-pointer px-3 py-2 rounded text-sm truncate hover:bg-gray-200 ${
                        sessionId === group.session_id ? 'bg-gray-200 font-medium' : ''
                      }`}
                      title={group.title}
                    >
                      {group.title}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* AUTH */}
        <div className="border-t p-3 text-center">
          {!user ? (
            sidebarOpen && (
              <button
                onClick={() => (window.location.href = `${BACKEND_URL}/auth/login`)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sign in with Google
              </button>
            )
          ) : (
            sidebarOpen && (
              <div className="space-y-y-2">
                <img src={user.picture} alt="avatar" className="w-10 h-10 rounded-full mx-auto" />
                <div className="text-sm font-medium mt-2">{user.name}</div>
                <button
                  onClick={() => {
                    localStorage.removeItem('jwt');
                    window.location.reload();
                  }}
                  className="w-full mt-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Logout
                </button>
              </div>
            )
          )}
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="py-3 border-t hover:bg-gray-100 font-bold"
        >
          {sidebarOpen ? '<<' : '>>'}
        </button>

        {/* RESIZE HANDLE */}
        <div
             onMouseDown={startResize}
             className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-gray-300"
        >
        </div>

      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              Start a new chat or select one from the sidebar
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                {m.role === 'bot' ? (
                  <BotMessage text={m.text} />
                ) : (
                  <div className="inline-block bg-blue-600 text-white px-5 py-3 rounded-2xl max-w-2xl">
                    {m.text}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t bg-white">
          <div className="flex items-end bg-gray-100 rounded-3xl p-3">
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
              placeholder="Ask anything..."
              className="flex-1 bg-transparent outline-none resize-none text-lg"
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
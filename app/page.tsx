// page.tsx (white sidebar + history + bottom auth button + collapsible)
// FIXED: history answer mapping now works with DynamoDB fields

'use client';

import React, { useEffect, useRef, useState } from 'react';

type ChatMessage = {
  role: 'user' | 'bot';
  text: string;
};

type SessionItem = {
  session_id: string;
  title: string;
};

const BACKEND_URL = 'https://proud1776ai.com';

type UserInfo = {
  email: string;
  name: string;
  picture: string;
};

type HistoryItem = {
  question: string;
  answer: string;
  session_id: string;
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

const TIMESTAMP_REGEX =
  /\[(Video1|Video2),\s*(\d{1,2}:\d{2}:\d{2}\.\d{3})\]/g;

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

    if (index > lastIndex)
      parts.push(text.slice(lastIndex, index));

    const [h, m, s] = timestamp.split(':').map(parseFloat);
    const seconds = h * 3600 + m * 60 + s;

    const url =
      `${VIDEO_URLS[videoKey] || '#'}?t=${Math.floor(seconds)}`;

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

  if (lastIndex < text.length)
    parts.push(text.slice(lastIndex));

  return parts;
}

function cleanBotText(text: string) {
  if (!text) return '';

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

/* ======================
            Page
====================== */

export default function Page() {

//  const BACKEND_URL = 'https://proud1776ai.com';

  const [user, setUser] = useState<UserInfo | null>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);


  /* ======================
       Load user
====================== */

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) return;

    fetch(`${BACKEND_URL}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(r => r.json())
      .then(d => d.email && setUser(d))
      .catch(console.error);
  }, []);

  /* ======================
     Load History
====================== */

  /* ======================
     Load History
  ====================== */

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('jwt');

    fetch(`${BACKEND_URL}/api/history`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(r => r.json())
      .then(data => {

        if (!Array.isArray(data)) return;

        // ✅ EXACT MATCH to your DynamoDB schema
        const normalized: HistoryItem[] = data.map((item: any) => {

          const question =
            item.question?.S ??   // raw DynamoDB format
            item.question ??      // normal JSON format
            '';

          const answer =
            item.answer?.S ??     // raw DynamoDB format
            item.answer ??        // normal JSON format
            '';

          const session_id =
            item.session_id?.S ??   // raw DynamoDB format
            item.session_id ??      // normal JSON format
            '';
          return { question, answer, session_id };
        });

        setHistory(normalized);

      })
      .catch(console.error);

  }, [user]);

  // ======================
//   Auto-grow textarea
//====================== 

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height =
      `${textareaRef.current.scrollHeight}px`;
  }, [prompt]);

  // ======================
    //    Send Chat
//====================== /

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
      body: JSON.stringify({ 
        prompt,
        session_id: sessionId,
       }),
    });

    const newSessionId =  res.headers.get('X-Session-ID');

    if (newSessionId && !sessionId)
      setSessionId(newSessionId);

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

  // ======================
    //    Load History Chat
//====================== 

  const loadHistoryChat = (item: HistoryItem) => {

    setMessages([
      { role: 'user', text: item.question },
      { role: 'bot', text: item.answer || '(No saved answer found)' }
    ]);

    setPrompt('');
  };

  // ======================
    //     Render
//====================== 

  return (
    <div className="h-screen flex bg-gray-50">

      {/* ===== SIDEBAR ===== */ }
      <div className={`flex flex-col bg-white text-black border-r transition-all duration-300 
        ${sidebarOpen ? 'w-64' : 'w-14'}`}>

        <div className="flex-1 p-3 overflow-hidden">
          {sidebarOpen && (

            <>
              <div className="space-y-2">

                <button
                      className="rounded px-3 py-2 bg-gray-100 font-semibold w-full text-left hover:bg-gray-200"
                      onClick={() => {
                      setMessages([]);
                      setPrompt('');
                      setSessionId(null);   // ✅ THIS IS THE KEY FIX
                      }}
                >
                    New Chat
                </button>


                <div className="mt-4">
                  <div className="font-semibold mb-2">
                    History
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1">

                    {history.length === 0 && (
                      <div className="text-xs text-gray-400">
                        No history yet
                      </div>
                    )}

                    {history.map((h, i) => (
                      <div
                        key={i}
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

        {/* ===== AUTH ===== */}
        <div className="border-t px-2 py-3 text-center space-y-2">

          {!user ? (
            sidebarOpen && (
              <button
                onClick={() =>
                  (window.location.href =
                    `${BACKEND_URL}/auth/login`)
                }
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                  className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Logout
                </button>

              </div>
            )
          )}

        </div>

        {/* ===== TOGGLE ===== */}
        <button
          onClick={() => setSidebarOpen(s => !s)}
          className="w-full py-3 border-t font-semibold hover:bg-gray-100"
        >
          {sidebarOpen ? '<<' : '>>'}
        </button>

      </div>

      {/* ===== CHAT ===== */}
      <div className="flex-1 flex flex-col">

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === 'user'
                ? 'text-right'
                : 'text-left'}
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

        {/* ===== INPUT ===== */}
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
              placeholder="Ask about jogging or running..."
              className="flex-1 resize-none outline-none bg-transparent text-lg"
            />

            <button
              onClick={sendMessage}
              className="ml-3 px-5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
            >
              Send
            </button>

          </div>
        </div>

      </div>
    </div>
  );

  /* ======================
      LOAD CHAT SESSION
  ====================== */
  const loadSession = async (sid: string) => {

    setSessionId(sid);

    const res = await fetch(
      `${BACKEND_URL}/api/session/${sid}`,
      {
        headers: {
          Authorization:
            `Bearer ${localStorage.getItem('jwt') || ''}`,
        },
      }
    );

    const data = await res.json();

    const msgs: ChatMessage[] = [];

    data.forEach((item: any) => {
      msgs.push({ role: 'user', text: item.question });
      msgs.push({ role: 'bot', text: item.answer });
    });

    setMessages(msgs);
  };

  /* ======================
          RENDER
  ====================== */
  return (
    <div className="h-screen flex">

      {/* SIDEBAR */}
      <div className={`bg-white border-r p-3
        ${sidebarOpen ? 'w-64' : 'w-14'}`}>

        {sidebarOpen && (
          <>
            <h2 className="font-bold mb-2">History</h2>

            {sessions.map((s, i) => (
              <div
                key={i}
                onClick={() => loadSession(s.session_id)}
                className="cursor-pointer px-2 py-1 truncate hover:bg-gray-100 rounded"
              >
                {s.title}
              </div>
            ))}
          </>
        )}

        <button
          className="w-full mt-2"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? '<<' : '>>'}
        </button>
      </div>

      {/* CHAT */}
      <div className="flex-1 flex flex-col">

        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === 'user'
                  ? 'text-right'
                  : 'text-left'
              }
            >
              <div>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* INPUT */}
        <div className="p-3 border-t">

          <textarea
            ref={textareaRef}
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
            rows={1}
            className="w-full border rounded p-2"
          />

          <button
            onClick={sendMessage}
            className="mt-2 px-5 py-2 bg-green-600 text-white rounded"
          >
            Send
          </button>

        </div>
      </div>
    </div>
  );

}

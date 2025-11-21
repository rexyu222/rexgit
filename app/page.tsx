'use client';

import { useState } from 'react';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import LoginButton from './auth/login-button';

type MessageModel = {
  message: string;
  sentTime: string;
  sender: string;
  direction: 'incoming' | 'outgoing';
  position: 'single' | 'first' | 'last' | 'normal';
};

const BACKEND_URL = 'https://proud1776ai.com'; // your EC2 domain

// Force all relative paths to go to your real domain
const API_URL = typeof window !== 'undefined' 
  ? 'https://proud1776ai.com' 
  : '';

fetch(`${API_URL}/api/me`, { credentials: 'include' })

export default function Home() {
  const [messages, setMessages] = useState<MessageModel[]>([
    {
      message: "Hi! I'm your AI assistant rex2.",
      sentTime: "just now",
      sender: "bot",
      direction: "incoming",
      position: "single",
    },
  ]);

  const [typing, setTyping] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: MessageModel = {
      message: text,
      sender: "user",
      direction: "outgoing",
      sentTime: "just now",
      position: "single",
    };

    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        credentials: 'include', // important for cookies/sessions
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: text }),
      });

      // Always log status for debugging
      console.log('Response status:', res.status, res.ok);

      let botReply = "Sorry, something went wrong. Please try again.";

      if (res.ok) {
        try {
          const data = await res.json();
          botReply = data.reply || data.message || "I'm thinking...";
        } catch (jsonErr) {
          console.error('Failed to parse JSON:', jsonErr);
          const textBody = await res.clone().text();
          console.error('Raw response body:', textBody);
          botReply = "Received invalid response from server.";
        }
      } else {
        // Non-200 status
        const errorText = await res.text();
        console.error(`Server error ${res.status}:`, errorText);
        botReply = `Server error: ${res.status} – ${errorText || 'Unknown error'}`;
      }

      const botMsg: MessageModel = {
        message: botReply,
        sender: "bot",
        direction: "incoming",
        sentTime: "just now",
        position: "single",
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Network or fetch error:', err);

      const errorMessage = err?.message || 'Connection failed';

      const errorMsg: MessageModel = {
        message: `Error: ${errorMessage}`,
        sender: "bot",
        direction: "incoming",
        sentTime: "just now",
        position: "single",
      };

      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div style={{ height: '100vh', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <LoginButton />
      <MainContainer>
        <ChatContainer>
          <MessageList
            typingIndicator={typing && <TypingIndicator content="rex2 is typing..." />}
          >
            {messages.map((m, i) => (
              <Message
                key={i}
                model={{
                  ...m,
                  // Fix avatar if you want
                  // avatar: m.sender === 'bot' ? '/bot-avatar.png' : undefined
                }}
              />
            ))}
          </MessageList>
          <MessageInput
            placeholder="Ask me about jogging history..."
            onSend={sendMessage}
            attachButton={false}
            autoFocus
          />
        </ChatContainer>
      </MainContainer>
    </div>
  );
} 
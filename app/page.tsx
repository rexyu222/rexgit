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

// ... your existing imports
import LoginButton from './auth/login-button';

// Inside return():
<div style={{ height: '100vh', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
  <LoginButton />
  <MainContainer>
    {/* rest of your chat UI */}
  </MainContainer>
</div>

type MessageModel = {
  message: string;
  sentTime: string;
  sender: string;
  direction: 'incoming' | 'outgoing';
  position: 'single' | 'first' | 'last' | 'normal';
};

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
    const userMsg: MessageModel = {
      message: text,
      sender: "user",
      direction: "outgoing",
      sentTime: "now",
      position: "single",
    };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      const botMsg: MessageModel = {
        message: data.reply || "I'm thinking...",
        sender: "bot",
        direction: "incoming",
        sentTime: "now",
        position: "single",
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        message: "Error: Could not reach server",
        sender: "bot",
        direction: "incoming",
        sentTime: "now",
        position: "single",
      }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div style={{ height: '100vh', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <MainContainer>
        <ChatContainer>
          <MessageList
            typingIndicator={typing && <TypingIndicator content="Bot is typing..." />}
          >
            {messages.map((m, i) => (
              <Message key={i} model={m} />
            ))}
          </MessageList>
          <MessageInput
            placeholder="Type your message..."
            onSend={sendMessage}
            attachButton={false}
          />
        </ChatContainer>
      </MainContainer>
    </div>
  );
}
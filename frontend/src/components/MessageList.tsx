import React from "react";
import { ChatMessage } from "../hooks/useChatBoard";

interface Props {
  messages: ChatMessage[];
  currentAddress: string | null;
  isLoading: boolean;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export const MessageList: React.FC<Props> = ({ messages, currentAddress, isLoading }) => {
  if (isLoading && messages.length === 0) {
    return <div className="messages-loading">Loading messages...</div>;
  }

  if (messages.length === 0) {
    return <div className="messages-empty">No messages yet. Be the first to chat and earn BOARD!</div>;
  }

  return (
    <div className="message-list">
      {messages.map((msg) => {
        const isOwn = currentAddress?.toLowerCase() === msg.author.toLowerCase();
        return (
          <div key={msg.id} className={`message-item ${isOwn ? "own" : "other"}`}>
            <div className="message-header">
              <span className="message-author">{isOwn ? "You" : shortAddr(msg.author)}</span>
              <span className="message-time">{formatTime(msg.timestamp)}</span>
              {msg.rewarded && <span className="reward-badge">+BOARD</span>}
            </div>
            <div className="message-content">{msg.content}</div>
          </div>
        );
      })}
    </div>
  );
};

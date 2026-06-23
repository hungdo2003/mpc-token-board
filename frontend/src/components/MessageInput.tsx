import React, { useState, KeyboardEvent } from "react";

interface Props {
  onSend: (content: string) => Promise<void>;
  isPosting: boolean;
  disabled: boolean;
}

export const MessageInput: React.FC<Props> = ({ onSend, isPosting, disabled }) => {
  const [content, setContent] = useState("");

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || isPosting || disabled) return;
    await onSend(trimmed);
    setContent("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input-container">
      <textarea
        className="message-input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "Connect wallet to chat..." : "Type a message... (Enter to send, Shift+Enter for newline)"}
        disabled={disabled || isPosting}
        maxLength={1000}
        rows={3}
      />
      <div className="input-footer">
        <span className="char-count">{content.length}/1000</span>
        <button className="send-btn" onClick={handleSend} disabled={!content.trim() || isPosting || disabled}>
          {isPosting ? "Sending..." : "Send & Earn BOARD"}
        </button>
      </div>
      {!disabled && (
        <p className="reward-hint">Each message earns BOARD tokens via MPC automation</p>
      )}
    </div>
  );
};

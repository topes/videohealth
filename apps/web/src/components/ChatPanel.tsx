import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../hooks/useRoomRealtime';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  selfName: string;
}

export function ChatPanel({ messages, onSend, selfName }: ChatPanelProps) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <div
        ref={listRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: 'var(--color-text-subtle)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
            No messages yet. Say hi.
          </div>
        )}
        {messages.map((m) => {
          const isSelf = m.self || m.from === selfName;
          return (
            <div
              key={m.id}
              style={{
                alignSelf: isSelf ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}
            >
              {!isSelf && (
                <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginBottom: 2, paddingLeft: 4 }}>
                  {m.from}
                </div>
              )}
              <div
                style={{
                  background: isSelf ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                  color: isSelf ? '#fff' : 'var(--color-text)',
                  padding: '8px 12px',
                  borderRadius: 14,
                  borderTopRightRadius: isSelf ? 4 : 14,
                  borderTopLeftRadius: isSelf ? 14 : 4,
                  fontSize: 14,
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 8,
          padding: 10,
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <input
          className="input"
          placeholder="Message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ padding: '10px 12px', fontSize: 14 }}
        />
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type * as Y from 'yjs';

interface NotesProps {
  doc: Y.Doc;
}

export function Notes({ doc }: NotesProps) {
  const yText = doc.getText('notes');
  const [value, setValue] = useState(() => yText.toString());
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const localChange = useRef(false);

  useEffect(() => {
    const handler = () => {
      if (localChange.current) return;
      setValue(yText.toString());
    };
    yText.observe(handler);
    return () => yText.unobserve(handler);
  }, [yText]);

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    const current = yText.toString();
    localChange.current = true;
    doc.transact(() => {
      const diff = firstDiff(current, next);
      if (diff.delete > 0) yText.delete(diff.index, diff.delete);
      if (diff.insert) yText.insert(diff.index, diff.insert);
    });
    localChange.current = false;
    setValue(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--color-border)',
          fontSize: 12,
          color: 'var(--color-text-muted)',
        }}
      >
        Shared clinical notes · syncs live
      </div>
      <textarea
        ref={areaRef}
        value={value}
        onChange={onChange}
        placeholder="Start typing shared notes…"
        style={{
          flex: 1,
          minHeight: 0,
          border: 'none',
          resize: 'none',
          padding: 14,
          fontFamily: 'inherit',
          fontSize: 14,
          lineHeight: 1.5,
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          outline: 'none',
        }}
      />
    </div>
  );
}

function firstDiff(a: string, b: string): { index: number; delete: number; insert: string } {
  let start = 0;
  const minLen = Math.min(a.length, b.length);
  while (start < minLen && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  return { index: start, delete: endA - start, insert: b.slice(start, endB) };
}

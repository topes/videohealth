import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { config } from '../lib/config';

interface RoomInviteProps {
  code: string;
  onClose: () => void;
}

export function RoomInvite({ code, onClose }: RoomInviteProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  const joinUrl = `${config.appOrigin}/join/${encodeURIComponent(code)}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(joinUrl, {
      margin: 1,
      width: 320,
      color: { dark: '#1a2332', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch((err) => console.error('QR generation failed', err));
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  async function copy(value: string, tag: 'link' | 'code') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(tag);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard may be blocked */
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Invite others to this room"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26, 35, 50, 0.42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          width: 'min(420px, 100%)',
          padding: 24,
          boxShadow: 'var(--shadow-md)',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: 20, marginBottom: 6 }}>Invite to this room</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 20, fontSize: 14 }}>
          Scan the QR code or share the room code below.
        </p>

        <div
          style={{
            width: 220,
            height: 220,
            margin: '0 auto 16px',
            background: '#fff',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {dataUrl ? (
            <img src={dataUrl} alt="Room join QR code" width={200} height={200} />
          ) : (
            <span style={{ color: 'var(--color-text-subtle)', fontSize: 13 }}>Generating…</span>
          )}
        </div>

        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          <button
            className="btn btn-ghost"
            onClick={() => copy(code, 'code')}
            style={{ justifyContent: 'space-between', padding: '12px 14px' }}
          >
            <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Room code</span>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.18em' }}>{code}</span>
            <span style={{ fontSize: 12, color: 'var(--color-accent)' }}>
              {copied === 'code' ? 'Copied' : 'Copy'}
            </span>
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => copy(joinUrl, 'link')}
            style={{ justifyContent: 'space-between', padding: '10px 14px', fontSize: 13 }}
          >
            <span style={{ color: 'var(--color-text-muted)' }}>Join link</span>
            <span
              style={{
                maxWidth: '55%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--color-text)',
              }}
            >
              {joinUrl}
            </span>
            <span style={{ color: 'var(--color-accent)' }}>
              {copied === 'link' ? 'Copied' : 'Copy'}
            </span>
          </button>
        </div>

        <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
          Done
        </button>
      </div>
    </div>
  );
}

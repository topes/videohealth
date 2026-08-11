import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { BrandMark } from '../components/BrandMark';
import { api } from '../lib/api';
import '../styles/room.css';

type Mode = 'idle' | 'create' | 'join';

const CODE_PATTERN = /^[A-Za-z0-9]{4,8}$/;

export function LandingPage() {
  const [mode, setMode] = useState<Mode>('idle');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!displayName.trim()) return setError('Enter a display name.');
    setBusy(true);
    try {
      const res = await api.createRoom(displayName.trim());
      sessionStorage.setItem(
        `vh.session.${res.code}`,
        JSON.stringify({ meeting: res.meeting, attendee: res.attendee, displayName: res.displayName }),
      );
      nav(`/room/${res.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!displayName.trim()) return setError('Enter a display name.');
    const trimmed = code.trim().toUpperCase();
    if (!CODE_PATTERN.test(trimmed)) return setError('Enter a valid 4–8 character room code.');
    setBusy(true);
    try {
      const res = await api.joinRoom(trimmed, displayName.trim());
      sessionStorage.setItem(
        `vh.session.${res.code}`,
        JSON.stringify({ meeting: res.meeting, attendee: res.attendee, displayName: res.displayName }),
      );
      nav(`/room/${res.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <div className="landing-hero page-enter">
        <BrandMark size="lg" />
        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 700,
            marginTop: 28,
            letterSpacing: '-0.02em',
          }}
        >
          Face-to-face care, anywhere.
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 12, maxWidth: 440 }}>
          Start a private video visit in seconds. Share your screen, chat, sketch, and take notes together.
        </p>

        {mode === 'idle' && (
          <div className="landing-ctas">
            <button className="btn btn-primary" onClick={() => setMode('create')}>
              Create a room
            </button>
            <button className="btn btn-ghost" onClick={() => setMode('join')}>
              Join a room
            </button>
          </div>
        )}

        {mode !== 'idle' && (
          <form
            className="landing-form"
            onSubmit={mode === 'create' ? handleCreate : handleJoin}
          >
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>
              {mode === 'create' ? 'Create a new room' : 'Join an existing room'}
            </h2>

            <label className="field-label" htmlFor="displayName">
              Your display name
            </label>
            <input
              id="displayName"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Dr. Lopes"
              autoFocus
              maxLength={40}
            />

            {mode === 'join' && (
              <div style={{ marginTop: 14 }}>
                <label className="field-label" htmlFor="code">
                  Room code
                </label>
                <input
                  id="code"
                  className="input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCD"
                  style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}
                  maxLength={8}
                />
              </div>
            )}

            {error && (
              <div style={{ marginTop: 14, color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>
            )}

            <div className="landing-form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setMode('idle')} disabled={busy}>
                Back
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'create' ? 'Create room' : 'Join room'}
              </button>
            </div>
          </form>
        )}
      </div>
    </PageShell>
  );
}

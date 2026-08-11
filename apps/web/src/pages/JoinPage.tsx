import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { BrandMark } from '../components/BrandMark';
import { api } from '../lib/api';
import '../styles/room.css';

export function JoinPage() {
  const { code = '' } = useParams();
  const nav = useNavigate();
  const normalized = code.toUpperCase();

  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!displayName.trim()) return setError('Enter a display name.');
    setBusy(true);
    try {
      const res = await api.joinRoom(normalized, displayName.trim());
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
      <div className="landing-hero">
        <form className="landing-form" onSubmit={handleJoin} style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <BrandMark size="md" />
          </div>
          <h1 style={{ fontSize: 20, textAlign: 'center', marginBottom: 8 }}>Join room</h1>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Room code <strong style={{ color: 'var(--color-text)' }}>{normalized}</strong>
          </p>

          <label className="field-label" htmlFor="displayName">
            Your display name
          </label>
          <input
            id="displayName"
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Sam Patient"
            autoFocus
            maxLength={40}
          />

          {error && (
            <div style={{ marginTop: 14, color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>
          )}

          <div className="landing-form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => nav('/')} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Please wait…' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}

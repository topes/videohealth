import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { RoomInvite } from '../components/RoomInvite';
import { ChatPanel } from '../components/ChatPanel';
import { PresenceList } from '../components/PresenceList';
import { Whiteboard } from '../components/Whiteboard';
import { Notes } from '../components/Notes';
import { useChimeSession } from '../hooks/useChimeSession';
import { useRoomRealtime } from '../hooks/useRoomRealtime';

type PanelTab = 'chat' | 'whiteboard' | 'notes';

interface SessionCache {
  meeting: unknown;
  attendee: unknown;
  displayName: string;
}

export function RoomPage() {
  const { code = '' } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState<PanelTab>('chat');
  const [inviteOpen, setInviteOpen] = useState(false);

  const cached = useMemo<SessionCache | null>(() => {
    const raw = sessionStorage.getItem(`vh.session.${code}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionCache;
    } catch {
      return null;
    }
  }, [code]);

  useEffect(() => {
    if (!cached) {
      nav(`/join/${code}`, { replace: true });
    }
  }, [cached, code, nav]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteContainerRef = useRef<HTMLDivElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);

  const chime = useChimeSession({
    meeting: cached?.meeting,
    attendee: cached?.attendee,
    localVideoRef,
    remoteContainerRef,
    screenShareRef,
  });

  const realtime = useRoomRealtime({
    code,
    displayName: cached?.displayName ?? 'Guest',
    enabled: Boolean(cached),
  });

  function leave() {
    chime.leave();
    realtime.leave();
    sessionStorage.removeItem(`vh.session.${code}`);
    nav('/');
  }

  if (!cached) return null;

  return (
    <div
      style={{
        height: '100%',
        display: 'grid',
        gridTemplateRows: 'var(--header-h) 1fr auto',
        background: 'var(--color-bg)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(16px, 3vw, 24px)',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <BrandMark size="sm" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              fontSize: 13,
              color: 'var(--color-text-muted)',
              padding: '6px 10px',
              background: 'var(--color-accent-tint)',
              borderRadius: 999,
              border: '1px solid var(--color-border)',
            }}
          >
            Room <strong style={{ color: 'var(--color-text)' }}>{code}</strong>
          </span>
          <button className="btn btn-ghost" onClick={() => setInviteOpen(true)}>
            Invite
          </button>
          <button className="btn btn-danger" onClick={leave}>
            Leave
          </button>
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: 16,
          padding: 16,
          minHeight: 0,
        }}
      >
        <section
          style={{
            display: 'grid',
            gridTemplateRows: '1fr auto',
            gap: 12,
            minHeight: 0,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
          }}
        >
          <div
            style={{
              position: 'relative',
              background: '#0f1a2b',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            <div
              ref={remoteContainerRef}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 8,
                padding: 8,
              }}
            />
            <video
              ref={screenShareRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: '#000',
                display: chime.isReceivingScreenShare ? 'block' : 'none',
              }}
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'absolute',
                right: 12,
                bottom: 12,
                width: 180,
                height: 120,
                objectFit: 'cover',
                borderRadius: 8,
                border: '2px solid rgba(255,255,255,0.15)',
                background: '#000',
                boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <button
              className={chime.muted ? 'btn btn-danger' : 'btn btn-ghost'}
              onClick={chime.toggleMute}
              disabled={!chime.ready}
            >
              {chime.muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              className={chime.videoOn ? 'btn btn-ghost' : 'btn btn-primary'}
              onClick={chime.toggleVideo}
              disabled={!chime.ready}
            >
              {chime.videoOn ? 'Stop video' : 'Start video'}
            </button>
            <button
              className={chime.sharingScreen ? 'btn btn-danger' : 'btn btn-ghost'}
              onClick={chime.toggleScreenShare}
              disabled={!chime.ready}
            >
              {chime.sharingScreen ? 'Stop sharing' : 'Share screen'}
            </button>
          </div>
        </section>

        <aside
          style={{
            display: 'grid',
            gridTemplateRows: 'auto auto 1fr',
            gap: 12,
            minHeight: 0,
          }}
        >
          <PresenceList
            self={cached.displayName}
            connectionStatus={realtime.status}
            peers={realtime.peers}
          />

          <div
            role="tablist"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 4,
              padding: 4,
              background: 'var(--color-surface-alt)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            {(['chat', 'whiteboard', 'notes'] as PanelTab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className="btn"
                style={{
                  padding: '8px 10px',
                  fontSize: 13,
                  background: tab === t ? 'var(--color-surface)' : 'transparent',
                  color: tab === t ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  border: 'none',
                  borderRadius: 8,
                  boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div
            style={{
              minHeight: 0,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {tab === 'chat' && (
              <ChatPanel
                messages={realtime.messages}
                onSend={realtime.sendChat}
                selfName={cached.displayName}
              />
            )}
            {tab === 'whiteboard' && <Whiteboard doc={realtime.yDoc} />}
            {tab === 'notes' && <Notes doc={realtime.yDoc} />}
          </div>
        </aside>
      </div>

      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '10px 24px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          fontSize: 12,
          color: 'var(--color-text-muted)',
        }}
      >
        <div>
          Signed in as <strong style={{ color: 'var(--color-text)' }}>{cached.displayName}</strong>
        </div>
        <div>
          Media: {chime.ready ? 'connected' : chime.error ? `error: ${chime.error}` : 'connecting…'} · Realtime:{' '}
          {realtime.status}
        </div>
      </footer>

      {inviteOpen && <RoomInvite code={code} onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

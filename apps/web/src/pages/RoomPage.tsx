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
import '../styles/room.css';

type PanelTab = 'chat' | 'whiteboard' | 'notes';
type MobilePane = 'call' | 'tools';

interface SessionCache {
  meeting: unknown;
  attendee: unknown;
  displayName: string;
}

function IconMic({ off }: { off?: boolean }) {
  if (off) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.5V12a3 3 0 0 1-.1.76"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 3a3 3 0 0 0-3 3v.5M19 12a7 7 0 0 1-1.4 4.2M5.5 12a7 7 0 0 0 8.7 6.75"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M12 19v2M8 21h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 12a6.5 6.5 0 0 0 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 18.5V21M8.5 21h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconCamera({ off }: { off?: boolean }) {
  if (off) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 8.5A2.5 2.5 0 0 1 5.5 6H12M15 6h1.5A2.5 2.5 0 0 1 19 8.5v7a2.5 2.5 0 0 1-.4 1.35"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M3 9v6.5A2.5 2.5 0 0 0 5.5 18H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M19 10.5l2.2-1.4A1 1 0 0 1 23 10v4a1 1 0 0 1-1.8.7L19 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="6" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16.5 10.2l3.7-2.3A1 1 0 0 1 22 8.7v6.6a1 1 0 0 1-1.8.7l-3.7-2.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconScreenShare() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 8v5M9.5 10.5 12 8l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RoomPage() {
  const { code = '' } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState<PanelTab>('chat');
  const [mobilePane, setMobilePane] = useState<MobilePane>('call');
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
    <div className="room">
      <header className="room-header">
        <div className="room-header-brand">
          <BrandMark size="sm" />
        </div>
        <div className="room-header-actions">
          <span className="room-code-chip">
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

      <nav className="room-mobile-nav" aria-label="Room sections">
        <button
          type="button"
          className={`btn room-mobile-nav-btn${mobilePane === 'call' ? ' is-active' : ''}`}
          onClick={() => setMobilePane('call')}
        >
          Call
        </button>
        <button
          type="button"
          className={`btn room-mobile-nav-btn${mobilePane === 'tools' ? ' is-active' : ''}`}
          onClick={() => setMobilePane('tools')}
        >
          Chat & notes
        </button>
      </nav>

      <div className="room-body" data-mobile-pane={mobilePane}>
        <section className="room-stage">
          <div
            className={`room-video-frame${chime.isReceivingScreenShare ? ' is-screenshare' : ''}`}
          >
            <div ref={remoteContainerRef} className="room-remote-grid" />
            <video
              ref={screenShareRef}
              className="room-screenshare"
              autoPlay
              playsInline
              muted
            />
            <video
              ref={localVideoRef}
              className="room-local-preview"
              autoPlay
              playsInline
              muted
            />

            <div className="room-controls" role="toolbar" aria-label="Call controls">
              <button
                type="button"
                className={`room-control-btn${chime.muted ? ' is-off' : ''}`}
                onClick={chime.toggleMute}
                disabled={!chime.ready}
                aria-label={chime.muted ? 'Unmute microphone' : 'Mute microphone'}
                aria-pressed={chime.muted}
                title={chime.muted ? 'Unmute' : 'Mute'}
              >
                <IconMic off={chime.muted} />
              </button>
              <button
                type="button"
                className={`room-control-btn${chime.videoOn ? '' : ' is-off'}`}
                onClick={chime.toggleVideo}
                disabled={!chime.ready}
                aria-label={chime.videoOn ? 'Turn camera off' : 'Turn camera on'}
                aria-pressed={!chime.videoOn}
                title={chime.videoOn ? 'Stop video' : 'Start video'}
              >
                <IconCamera off={!chime.videoOn} />
              </button>
              {chime.canShareScreen ? (
                <button
                  type="button"
                  className={`room-control-btn${chime.sharingScreen ? ' is-active' : ''}`}
                  onClick={chime.toggleScreenShare}
                  disabled={!chime.ready}
                  aria-label={chime.sharingScreen ? 'Stop sharing screen' : 'Share screen'}
                  aria-pressed={chime.sharingScreen}
                  title={chime.sharingScreen ? 'Stop sharing' : 'Share screen'}
                >
                  <IconScreenShare />
                </button>
              ) : (
                <button
                  type="button"
                  className="room-control-btn"
                  disabled
                  aria-label="Screen sharing not supported on this device"
                  title="Screen sharing isn’t available on this device. Use a desktop browser."
                >
                  <IconScreenShare />
                </button>
              )}
            </div>
          </div>
          {chime.error && (
            <div className="room-media-error" role="status">
              {chime.error}
            </div>
          )}
        </section>

        <aside className="room-aside">
          <PresenceList
            self={cached.displayName}
            connectionStatus={realtime.status}
            peers={realtime.peers}
          />

          <div className="room-tabs" role="tablist">
            {(['chat', 'whiteboard', 'notes'] as PanelTab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`btn room-tab${tab === t ? ' is-active' : ''}`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="room-panel">
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

      <footer className="room-footer">
        <div>
          Signed in as <strong style={{ color: 'var(--color-text)' }}>{cached.displayName}</strong>
        </div>
        <div className="room-footer-status">
          Media: {chime.ready ? 'connected' : chime.error ? `error: ${chime.error}` : 'connecting…'} ·
          Realtime: {realtime.status}
        </div>
      </footer>

      {inviteOpen && <RoomInvite code={code} onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

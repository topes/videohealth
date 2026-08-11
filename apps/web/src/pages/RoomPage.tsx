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
          <div className="room-video-frame">
            <div ref={remoteContainerRef} className="room-remote-grid" />
            <video
              ref={screenShareRef}
              className="room-screenshare"
              autoPlay
              playsInline
              muted
              style={{ display: chime.isReceivingScreenShare ? 'block' : 'none' }}
            />
            <video
              ref={localVideoRef}
              className="room-local-preview"
              autoPlay
              playsInline
              muted
            />
          </div>

          <div className="room-controls">
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

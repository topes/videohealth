import type { Peer, RealtimeStatus } from '../hooks/useRoomRealtime';

interface PresenceListProps {
  self: string;
  peers: Peer[];
  connectionStatus: RealtimeStatus;
}

function statusColor(status: RealtimeStatus) {
  switch (status) {
    case 'open':
      return 'var(--color-success)';
    case 'connecting':
      return '#e0b03f';
    case 'error':
      return 'var(--color-danger)';
    default:
      return 'var(--color-text-subtle)';
  }
}

export function PresenceList({ self, peers, connectionStatus }: PresenceListProps) {
  const others = peers.filter((p) => p.displayName !== self);
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <h3 style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>In this room</h3>
        <span
          title={`Realtime: ${connectionStatus}`}
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: statusColor(connectionStatus),
            display: 'inline-block',
          }}
        />
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        <li style={personRowStyle}>
          <Avatar name={self} accent />
          <span>
            <strong>{self}</strong>
            <span style={{ color: 'var(--color-text-subtle)' }}> · you</span>
          </span>
        </li>
        {others.map((p) => (
          <li key={p.connectionId} style={personRowStyle}>
            <Avatar name={p.displayName} />
            <span>{p.displayName}</span>
          </li>
        ))}
        {others.length === 0 && (
          <li style={{ ...personRowStyle, color: 'var(--color-text-subtle)', fontSize: 13 }}>
            Waiting for others…
          </li>
        )}
      </ul>
    </div>
  );
}

const personRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 14,
};

function Avatar({ name, accent }: { name: string; accent?: boolean }) {
  const initial = name.trim()[0]?.toUpperCase() ?? '?';
  return (
    <span
      style={{
        width: 26,
        height: 26,
        borderRadius: 999,
        background: accent ? 'var(--color-accent)' : 'var(--color-accent-soft)',
        color: accent ? '#fff' : 'var(--color-accent)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 600,
      }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

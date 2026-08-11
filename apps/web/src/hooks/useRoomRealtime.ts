import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { config } from '../lib/config';

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type RealtimeStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export interface ChatMessage {
  id: string;
  from: string;
  text: string;
  ts: number;
  self?: boolean;
}

export interface Peer {
  connectionId: string;
  displayName: string;
}

interface UseRoomRealtimeOptions {
  code: string;
  displayName: string;
  enabled: boolean;
}

interface WsInbound {
  type: string;
  [k: string]: unknown;
}

const HEARTBEAT_MS = 20_000;
const RECONNECT_MS = 2_000;

export function useRoomRealtime({ code, displayName, enabled }: UseRoomRealtimeOptions) {
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const yDoc = useMemo(() => new Y.Doc(), []);
  const heartbeatRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const closedByUser = useRef(false);

  const send = useCallback((msg: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(msg));
  }, []);

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const id = crypto.randomUUID();
      const ts = Date.now();
      setMessages((prev) => [...prev, { id, from: displayName, text: trimmed, ts, self: true }]);
      send({ action: 'chat', id, text: trimmed, ts });
    },
    [displayName, send],
  );

  const leave = useCallback(() => {
    closedByUser.current = true;
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        /* noop */
      }
    }
    if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
    if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
  }, []);

  useEffect(() => {
    if (!enabled || !code || !config.wsUrl) return;
    closedByUser.current = false;

    const yjsHandler = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return;
      send({ action: 'yjs', update: bytesToBase64(update) });
    };

    yDoc.on('update', yjsHandler);

    function connect() {
      setStatus('connecting');
      const url = `${config.wsUrl}?code=${encodeURIComponent(code)}&name=${encodeURIComponent(displayName)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('open');
        send({ action: 'presence.hello' });
        const initial = Y.encodeStateAsUpdate(yDoc);
        if (initial.length > 0) {
          send({ action: 'yjs', update: bytesToBase64(initial) });
        }
        send({ action: 'yjs.request' });
        heartbeatRef.current = window.setInterval(() => send({ action: 'presence.ping' }), HEARTBEAT_MS);
      };

      ws.onmessage = (ev) => {
        let data: WsInbound;
        try {
          data = JSON.parse(ev.data) as WsInbound;
        } catch {
          return;
        }
        handleInbound(data);
      };

      ws.onerror = () => setStatus('error');
      ws.onclose = () => {
        setStatus('closed');
        if (heartbeatRef.current) {
          window.clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        if (!closedByUser.current) {
          reconnectRef.current = window.setTimeout(connect, RECONNECT_MS);
        }
      };
    }

    function handleInbound(msg: WsInbound) {
      switch (msg.type) {
        case 'chat': {
          const m = msg as unknown as { id: string; from: string; text: string; ts: number };
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, { id: m.id, from: m.from, text: m.text, ts: m.ts }],
          );
          break;
        }
        case 'presence.state': {
          const p = msg as unknown as { peers?: Peer[] };
          const next = Array.isArray(p.peers)
            ? p.peers.filter((peer) => Boolean(peer?.connectionId) && Boolean(peer?.displayName))
            : [];
          setPeers(next);
          break;
        }
        case 'yjs': {
          const p = msg as unknown as { update: string };
          try {
            const bin = base64ToBytes(p.update);
            Y.applyUpdate(yDoc, bin, 'remote');
          } catch (err) {
            console.warn('Failed to apply yjs update', err);
          }
          break;
        }
        case 'yjs.request': {
          const state = Y.encodeStateAsUpdate(yDoc);
          if (state.length > 0) {
            send({ action: 'yjs', update: bytesToBase64(state) });
          }
          break;
        }
        default:
          break;
      }
    }

    connect();

    return () => {
      yDoc.off('update', yjsHandler);
      closedByUser.current = true;
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      try {
        wsRef.current?.close();
      } catch {
        /* noop */
      }
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, displayName, enabled]);

  return {
    status,
    messages,
    peers,
    sendChat,
    yDoc,
    leave,
  };
}

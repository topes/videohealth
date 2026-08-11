import type { APIGatewayProxyHandler } from 'aws-lambda';
import { getConnection, listConnectionsForRoom } from '../common/rooms';
import { apiGwClientFromEvent, broadcast, sendTo } from '../common/wsBroadcast';

interface InboundBase {
  action: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  if (!connectionId) return { statusCode: 400, body: 'missing connectionId' };

  const body = safeParse(event.body);
  if (!body || typeof body.action !== 'string') return { statusCode: 200, body: 'ok' };

  const conn = await getConnection(connectionId);
  if (!conn) return { statusCode: 200, body: 'ok' };

  const client = apiGwClientFromEvent(event);

  switch (body.action) {
    case 'presence.hello':
    case 'presence.ping': {
      const conns = await listConnectionsForRoom(conn.code);
      const peers = conns
        .filter((c) => Boolean(c.connectionId) && Boolean(c.displayName))
        .map((c) => ({ connectionId: c.connectionId, displayName: c.displayName }));
      await broadcast(client, conn.code, { type: 'presence.state', peers });
      break;
    }
    case 'chat': {
      const msg = body as { id?: string; text?: string; ts?: number };
      const payload = {
        type: 'chat',
        id: msg.id ?? cryptoRandom(),
        from: conn.displayName,
        text: String(msg.text ?? '').slice(0, 2000),
        ts: msg.ts ?? Date.now(),
      };
      await broadcast(client, conn.code, payload, connectionId);
      break;
    }
    case 'yjs': {
      const msg = body as { update?: string };
      if (!msg.update) break;
      await broadcast(
        client,
        conn.code,
        { type: 'yjs', update: msg.update, from: conn.displayName },
        connectionId,
      );
      break;
    }
    case 'yjs.request': {
      const conns = await listConnectionsForRoom(conn.code);
      await Promise.all(
        conns
          .filter((c) => c.connectionId !== connectionId)
          .map((c) => sendTo(client, c.connectionId, { type: 'yjs.request', from: connectionId })),
      );
      break;
    }
    default:
      break;
  }
  return { statusCode: 200, body: 'ok' };
};

function safeParse(body: string | null | undefined): (InboundBase & Record<string, unknown>) | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body);
    return typeof parsed === 'object' && parsed !== null ? (parsed as InboundBase & Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function cryptoRandom(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

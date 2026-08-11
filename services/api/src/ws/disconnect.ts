import type { APIGatewayProxyHandler } from 'aws-lambda';
import { deleteConnection, getConnection } from '../common/rooms';
import { apiGwClientFromEvent, broadcast } from '../common/wsBroadcast';

export const handler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  if (!connectionId) return { statusCode: 200, body: 'ok' };

  const conn = await getConnection(connectionId).catch(() => null);
  await deleteConnection(connectionId).catch(() => undefined);

  if (conn) {
    const client = apiGwClientFromEvent(event);
    const remaining = await broadcast(
      client,
      conn.code,
      { type: 'presence.leave', connectionId, displayName: conn.displayName },
      connectionId,
    );
    const peers = remaining
      .filter((c) => c.connectionId !== connectionId)
      .map((c) => ({ connectionId: c.connectionId, displayName: c.displayName }));
    await broadcast(client, conn.code, { type: 'presence.state', peers }, connectionId);
  }
  return { statusCode: 200, body: 'ok' };
};

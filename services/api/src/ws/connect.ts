import type { APIGatewayProxyHandler } from 'aws-lambda';
import { connectionKey, connTtlSeconds, getRoom, putConnection, type ConnectionItem } from '../common/rooms';

export const handler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  if (!connectionId) return { statusCode: 400, body: 'missing connectionId' };

  const qs = event.queryStringParameters ?? {};
  const code = (qs.code ?? '').toUpperCase();
  const displayName = (qs.name ?? '').slice(0, 40) || 'Guest';

  if (!code) return { statusCode: 400, body: 'missing code' };
  const room = await getRoom(code);
  if (!room) return { statusCode: 404, body: 'room not found' };

  const item: ConnectionItem = {
    ...connectionKey(connectionId),
    type: 'CONN',
    connectionId,
    code,
    displayName,
    joinedAt: Date.now(),
    ttl: connTtlSeconds(),
  };
  await putConnection(item);

  return { statusCode: 200, body: 'ok' };
};

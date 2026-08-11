import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { deleteConnection, listConnectionsForRoom, type ConnectionItem } from './rooms';

interface WsEvent {
  requestContext: { domainName?: string; stage?: string };
}

function endpointFromEvent(event: WsEvent): string {
  const domain = event.requestContext.domainName ?? '';
  const stage = event.requestContext.stage ?? '';
  return `https://${domain}/${stage}`;
}

export function apiGwClientFromEvent(event: WsEvent): ApiGatewayManagementApiClient {
  return new ApiGatewayManagementApiClient({ endpoint: endpointFromEvent(event) });
}

export async function sendTo(
  client: ApiGatewayManagementApiClient,
  connectionId: string,
  payload: unknown,
): Promise<boolean> {
  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(payload)),
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof GoneException || (err as { name?: string })?.name === 'GoneException') {
      await deleteConnection(connectionId).catch(() => undefined);
      return false;
    }
    throw err;
  }
}

export async function broadcast(
  client: ApiGatewayManagementApiClient,
  code: string,
  payload: unknown,
  excludeConnectionId?: string,
): Promise<ConnectionItem[]> {
  const conns = await listConnectionsForRoom(code);
  await Promise.all(
    conns
      .filter((c) => c.connectionId !== excludeConnectionId)
      .map((c) => sendTo(client, c.connectionId, payload).catch((err) => console.warn('send failed', err))),
  );
  return conns;
}

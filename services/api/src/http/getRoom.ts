import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { badRequest, corsOnly, ok, requestOrigin, serverError } from '../common/http';
import { getRoom } from '../common/rooms';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const origin = requestOrigin(event.headers);
  try {
    if (event.requestContext.http.method === 'OPTIONS') {
      return corsOnly(origin);
    }
    const code = (event.pathParameters?.code ?? '').toUpperCase();
    if (!code) return badRequest('Missing room code', origin);
    const room = await getRoom(code);
    return ok({ code, exists: !!room }, origin);
  } catch (err) {
    return serverError(err, origin);
  }
};

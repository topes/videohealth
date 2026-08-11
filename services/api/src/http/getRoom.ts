import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { badRequest, ok, serverError } from '../common/http';
import { getRoom } from '../common/rooms';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (event.requestContext.http.method === 'OPTIONS') {
      return { statusCode: 204, headers: {}, body: '' };
    }
    const code = (event.pathParameters?.code ?? '').toUpperCase();
    if (!code) return badRequest('Missing room code');
    const room = await getRoom(code);
    return ok({ code, exists: !!room });
  } catch (err) {
    return serverError(err);
  }
};

import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { badRequest, notFound, ok, parseJson, serverError } from '../common/http';
import { createAttendee } from '../common/chime';
import { getRoom } from '../common/rooms';

interface Body {
  displayName?: string;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (event.requestContext.http.method === 'OPTIONS') {
      return { statusCode: 204, headers: {}, body: '' };
    }
    const code = (event.pathParameters?.code ?? '').toUpperCase();
    if (!code) return badRequest('Missing room code');

    const body = parseJson<Body>(event.body ?? null) ?? {};
    const displayName = (body.displayName ?? '').trim().slice(0, 40);
    if (!displayName) return badRequest('displayName is required');

    const room = await getRoom(code);
    if (!room) return notFound('Room not found');

    const externalUserId = `${room.code}#${displayName}`;
    const attendee = await createAttendee(room.meetingId, externalUserId);

    return ok({
      code: room.code,
      displayName,
      meeting: room.meeting,
      attendee,
    });
  } catch (err) {
    return serverError(err);
  }
};

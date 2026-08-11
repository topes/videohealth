import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  badRequest,
  corsOnly,
  notFound,
  ok,
  parseJson,
  requestOrigin,
  serverError,
} from '../common/http';
import { createAttendee } from '../common/chime';
import { getRoom } from '../common/rooms';

interface Body {
  displayName?: string;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const origin = requestOrigin(event.headers);
  try {
    if (event.requestContext.http.method === 'OPTIONS') {
      return corsOnly(origin);
    }
    const code = (event.pathParameters?.code ?? '').toUpperCase();
    if (!code) return badRequest('Missing room code', origin);

    const body = parseJson<Body>(event.body ?? null) ?? {};
    const displayName = (body.displayName ?? '').trim().slice(0, 40);
    if (!displayName) return badRequest('displayName is required', origin);

    const room = await getRoom(code);
    if (!room) return notFound('Room not found', origin);

    const externalUserId = `${room.code}#${displayName}`;
    const attendee = await createAttendee(room.meetingId, externalUserId);

    return ok(
      {
        code: room.code,
        displayName,
        meeting: room.meeting,
        attendee,
      },
      origin,
    );
  } catch (err) {
    return serverError(err, origin);
  }
};

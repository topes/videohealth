import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  badRequest,
  corsOnly,
  created,
  parseJson,
  requestOrigin,
  serverError,
} from '../common/http';
import { createMeeting, createAttendee } from '../common/chime';
import { createUniqueRoom } from '../common/rooms';

interface Body {
  displayName?: string;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const origin = requestOrigin(event.headers);
  try {
    if (event.requestContext.http.method === 'OPTIONS') {
      return corsOnly(origin);
    }
    const body = parseJson<Body>(event.body ?? null) ?? {};
    const displayName = (body.displayName ?? '').trim().slice(0, 40);
    if (!displayName) return badRequest('displayName is required', origin);

    const externalMeetingId = `vh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { meeting } = await createMeeting(externalMeetingId);
    if (!meeting.MeetingId) throw new Error('Chime meeting missing MeetingId');
    const room = await createUniqueRoom(meeting);

    const externalUserId = `${room.code}#${displayName}`;
    const attendee = await createAttendee(meeting.MeetingId, externalUserId);

    return created(
      {
        code: room.code,
        displayName,
        meeting,
        attendee,
      },
      origin,
    );
  } catch (err) {
    return serverError(err, origin);
  }
};

import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { badRequest, created, parseJson, serverError } from '../common/http';
import { createMeeting, createAttendee } from '../common/chime';
import { createUniqueRoom } from '../common/rooms';

interface Body {
  displayName?: string;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (event.requestContext.http.method === 'OPTIONS') {
      return { statusCode: 204, headers: {}, body: '' };
    }
    const body = parseJson<Body>(event.body ?? null) ?? {};
    const displayName = (body.displayName ?? '').trim().slice(0, 40);
    if (!displayName) return badRequest('displayName is required');

    const externalMeetingId = `vh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { meeting } = await createMeeting(externalMeetingId);
    if (!meeting.MeetingId) throw new Error('Chime meeting missing MeetingId');
    const room = await createUniqueRoom(meeting);

    const externalUserId = `${room.code}#${displayName}`;
    const attendee = await createAttendee(meeting.MeetingId, externalUserId);

    return created({
      code: room.code,
      displayName,
      meeting,
      attendee,
    });
  } catch (err) {
    return serverError(err);
  }
};

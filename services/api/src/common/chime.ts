import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  type Meeting,
  type Attendee,
} from '@aws-sdk/client-chime-sdk-meetings';
const CHIME_MEDIA_REGION = process.env.CHIME_MEDIA_REGION ?? 'us-east-1';

export const chime = new ChimeSDKMeetingsClient({});

export interface CreateMeetingResult {
  meeting: Meeting;
}

export async function createMeeting(externalMeetingId: string): Promise<CreateMeetingResult> {
  const res = await chime.send(
    new CreateMeetingCommand({
      ClientRequestToken: `${externalMeetingId}-${Date.now()}`,
      ExternalMeetingId: externalMeetingId,
      MediaRegion: CHIME_MEDIA_REGION,
    }),
  );
  if (!res.Meeting) throw new Error('Failed to create Chime meeting');
  return { meeting: res.Meeting };
}

export async function createAttendee(
  meetingId: string,
  externalUserId: string,
): Promise<Attendee> {
  const res = await chime.send(
    new CreateAttendeeCommand({
      MeetingId: meetingId,
      ExternalUserId: externalUserId,
    }),
  );
  if (!res.Attendee) throw new Error('Failed to create Chime attendee');
  return res.Attendee;
}

export async function deleteMeeting(meetingId: string): Promise<void> {
  try {
    await chime.send(new DeleteMeetingCommand({ MeetingId: meetingId }));
  } catch (err) {
    console.warn('deleteMeeting failed', err);
  }
}

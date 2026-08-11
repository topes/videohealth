import { GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Meeting } from '@aws-sdk/client-chime-sdk-meetings';
import { ddb, TABLE, CONN_INDEX } from './ddb';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;

export function generateCode(len = CODE_LEN): string {
  let code = '';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export function roomTtlSeconds(hours = 24): number {
  return Math.floor(Date.now() / 1000) + hours * 3600;
}

export function connTtlSeconds(hours = 6): number {
  return Math.floor(Date.now() / 1000) + hours * 3600;
}

export interface RoomItem {
  pk: string;
  sk: string;
  type: 'ROOM';
  code: string;
  meetingId: string;
  meeting: Meeting;
  createdAt: number;
  ttl: number;
}

export interface ConnectionItem {
  pk: string;
  sk: string;
  type: 'CONN';
  connectionId: string;
  code: string;
  displayName: string;
  joinedAt: number;
  ttl: number;
}

export function roomKey(code: string) {
  return { pk: `ROOM#${code}`, sk: 'META' };
}

export function connectionKey(connectionId: string) {
  return { pk: `CONN#${connectionId}`, sk: 'META' };
}

export async function putRoom(item: RoomItem): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: 'attribute_not_exists(pk)',
    }),
  );
}

export async function getRoom(code: string): Promise<RoomItem | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: roomKey(code) }),
  );
  return (res.Item as RoomItem | undefined) ?? null;
}

export async function createUniqueRoom(meeting: Meeting): Promise<RoomItem> {
  if (!meeting.MeetingId) throw new Error('Meeting missing MeetingId');
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const item: RoomItem = {
      ...roomKey(code),
      type: 'ROOM',
      code,
      meetingId: meeting.MeetingId,
      meeting,
      createdAt: Date.now(),
      ttl: roomTtlSeconds(),
    };
    try {
      await putRoom(item);
      return item;
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === 'ConditionalCheckFailedException') continue;
      throw err;
    }
  }
  throw new Error('Could not allocate unique room code');
}

export async function putConnection(item: ConnectionItem): Promise<void> {
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
}

export async function getConnection(connectionId: string): Promise<ConnectionItem | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: connectionKey(connectionId) }),
  );
  return (res.Item as ConnectionItem | undefined) ?? null;
}

export async function deleteConnection(connectionId: string): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: connectionKey(connectionId) }));
}

export async function listConnectionsForRoom(code: string): Promise<ConnectionItem[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: CONN_INDEX,
      KeyConditionExpression: '#code = :c',
      // Room META rows also carry `code`, so exclude them from connection fan-out.
      FilterExpression: '#type = :conn',
      ExpressionAttributeNames: { '#code': 'code', '#type': 'type' },
      ExpressionAttributeValues: { ':c': code, ':conn': 'CONN' },
    }),
  );
  return (res.Items as ConnectionItem[] | undefined) ?? [];
}

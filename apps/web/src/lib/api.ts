import { config } from './config';

export interface ChimeMeetingResponse {
  Meeting: unknown;
  Attendee: unknown;
}

export interface CreateRoomResponse {
  code: string;
  meeting: unknown;
  attendee: unknown;
  displayName: string;
}

export interface JoinRoomResponse {
  code: string;
  meeting: unknown;
  attendee: unknown;
  displayName: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  createRoom(displayName: string): Promise<CreateRoomResponse> {
    return request<CreateRoomResponse>('/rooms', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    });
  },
  joinRoom(code: string, displayName: string): Promise<JoinRoomResponse> {
    return request<JoinRoomResponse>(`/rooms/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    });
  },
  getRoom(code: string): Promise<{ code: string; exists: boolean }> {
    return request(`/rooms/${encodeURIComponent(code)}`);
  },
};

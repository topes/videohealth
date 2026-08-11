import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { CORS_ORIGIN } from './config';

const ALLOWED_ORIGINS = CORS_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function resolveCorsOrigin(requestOrigin?: string | null): string {
  if (ALLOWED_ORIGINS.includes('*')) return '*';
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin;
  return ALLOWED_ORIGINS[0] ?? '*';
}

function baseHeaders(requestOrigin?: string | null): Record<string, string> {
  return {
    'content-type': 'application/json',
    'access-control-allow-origin': resolveCorsOrigin(requestOrigin),
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'cache-control': 'no-store',
    vary: 'Origin',
  };
}

export function corsOnly(requestOrigin?: string | null): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 204, headers: baseHeaders(requestOrigin), body: '' };
}

export function ok(body: unknown, requestOrigin?: string | null): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 200, headers: baseHeaders(requestOrigin), body: JSON.stringify(body) };
}

export function created(body: unknown, requestOrigin?: string | null): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 201, headers: baseHeaders(requestOrigin), body: JSON.stringify(body) };
}

export function badRequest(
  message: string,
  requestOrigin?: string | null,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 400,
    headers: baseHeaders(requestOrigin),
    body: JSON.stringify({ error: message }),
  };
}

export function notFound(
  message = 'Not found',
  requestOrigin?: string | null,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 404,
    headers: baseHeaders(requestOrigin),
    body: JSON.stringify({ error: message }),
  };
}

export function serverError(
  err: unknown,
  requestOrigin?: string | null,
): APIGatewayProxyStructuredResultV2 {
  console.error('server error', err);
  return {
    statusCode: 500,
    headers: baseHeaders(requestOrigin),
    body: JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
  };
}

export function requestOrigin(headers: Record<string, string | undefined> | undefined): string | null {
  if (!headers) return null;
  return headers.origin ?? headers.Origin ?? null;
}

export function parseJson<T>(body: string | null | undefined): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

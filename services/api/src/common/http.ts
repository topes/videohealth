import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { CORS_ORIGIN } from './config';

function baseHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json',
    'access-control-allow-origin': CORS_ORIGIN,
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'cache-control': 'no-store',
  };
}

export function ok(body: unknown): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 200, headers: baseHeaders(), body: JSON.stringify(body) };
}

export function created(body: unknown): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 201, headers: baseHeaders(), body: JSON.stringify(body) };
}

export function badRequest(message: string): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 400, headers: baseHeaders(), body: JSON.stringify({ error: message }) };
}

export function notFound(message = 'Not found'): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 404, headers: baseHeaders(), body: JSON.stringify({ error: message }) };
}

export function serverError(err: unknown): APIGatewayProxyStructuredResultV2 {
  console.error('server error', err);
  return {
    statusCode: 500,
    headers: baseHeaders(),
    body: JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
  };
}

export function parseJson<T>(body: string | null | undefined): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

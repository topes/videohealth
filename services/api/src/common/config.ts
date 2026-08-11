export function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env: ${name}`);
  return val;
}

export function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const CORS_ORIGIN = optional('CORS_ORIGIN', '*');

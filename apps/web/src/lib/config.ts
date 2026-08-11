const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const wsUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.replace(/\/$/, '') ?? '';

if (!apiUrl && import.meta.env.PROD) {
  console.warn('[videohealth] VITE_API_URL is not set at build time');
}
if (!wsUrl && import.meta.env.PROD) {
  console.warn('[videohealth] VITE_WS_URL is not set at build time');
}

export const config = {
  apiUrl,
  wsUrl,
  appOrigin: typeof window !== 'undefined' ? window.location.origin : '',
};

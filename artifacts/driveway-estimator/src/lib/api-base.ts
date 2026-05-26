// In development (Replit), VITE_API_URL is unset so apiBase is "" and all
// fetch calls stay relative (same server). On Netlify, set VITE_API_URL to
// your Replit backend URL, e.g. https://titan-api.replit.app
export const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

export const apiUrl = (path: string): string => `${apiBase}${path}`;

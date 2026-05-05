import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Resolution order:
//   1. EXPO_PUBLIC_BACKEND_URL (build-time env var) — preferred for native + cross-origin web.
//   2. Same-origin (empty prefix) — works on web hosts (e.g. Vercel) when /api/* is rewritten to the backend.
const RAW = process.env.EXPO_PUBLIC_BACKEND_URL;
const ENV_BASE = RAW && RAW !== 'undefined' ? RAW.replace(/\/$/, '') : '';
const BASE: string = ENV_BASE || (Platform.OS === 'web' ? '' : '');

if (!ENV_BASE && Platform.OS !== 'web') {
  // Native builds (iOS/Android) cannot resolve a relative URL — fail loud during development.
  console.warn(
    '[Cosmos] EXPO_PUBLIC_BACKEND_URL is not set. Native builds need an absolute backend URL.'
  );
}

const TOKEN_KEY = 'cosmos_token';

export const setToken = async (token: string) => AsyncStorage.setItem(TOKEN_KEY, token);
export const getToken = async () => AsyncStorage.getItem(TOKEN_KEY);
export const clearToken = async () => AsyncStorage.removeItem(TOKEN_KEY);

async function request(path: string, opts: RequestInit = {}, auth = false) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as any),
  };
  if (auth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const fullUrl = `${BASE}/api${path}`;
  let res: Response;
  try {
    res = await fetch(fullUrl, { ...opts, headers });
  } catch (e: any) {
    // Network error — backend unreachable or CORS blocked.
    throw new Error(
      `Cannot reach API at ${fullUrl}. Check that EXPO_PUBLIC_BACKEND_URL is set or that /api/* is rewritten to your backend.`
    );
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    // If the response wasn't JSON (e.g. an HTML 404 page from a misconfigured host), surface the URL.
    if (typeof data === 'string') {
      throw new Error(
        `API returned ${res.status} from ${fullUrl}. The backend is not reachable at this URL — set EXPO_PUBLIC_BACKEND_URL or fix the /api rewrite.`
      );
    }
    const detail = (data && data.detail) || `Request failed (${res.status})`;
    throw new Error(detail);
  }
  return data;
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  resetPassword: (email: string, new_password: string) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, new_password }) }),
  me: () => request('/auth/me', {}, true),

  listEvents: (upcomingOnly = false) =>
    request(`/events${upcomingOnly ? '?upcoming_only=true' : ''}`),
  getEvent: (id: string) => request(`/events/${id}`),

  listReminders: () => request('/reminders', {}, true),
  addReminder: (event_id: string, note = '') =>
    request('/reminders', { method: 'POST', body: JSON.stringify({ event_id, note }) }, true),
  deleteReminder: (id: string) =>
    request(`/reminders/${id}`, { method: 'DELETE' }, true),

  listSightings: () => request('/sightings'),
  mySightings: () => request('/sightings/me', {}, true),
  createSighting: (payload: any) =>
    request('/sightings', { method: 'POST', body: JSON.stringify(payload) }, true),
  likeSighting: (id: string) =>
    request(`/sightings/${id}/like`, { method: 'POST' }, true) as Promise<{ liked: boolean; likes: number }>,

  listSkySpots: () => request('/sky-spots'),
};

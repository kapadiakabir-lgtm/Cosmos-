import AsyncStorage from '@react-native-async-storage/async-storage';

// Production backend URL — baked into the bundle so the app works on ANY host
// (Vercel, Netlify, GitHub Pages, Expo Go, etc.) without needing env vars or
// rewrites configured at the deploy target. If you later move the backend,
// either change PROD_BACKEND_URL below OR set EXPO_PUBLIC_BACKEND_URL at build
// time to override.
const PROD_BACKEND_URL = 'https://celestial-journal.preview.emergentagent.com';

const RAW = process.env.EXPO_PUBLIC_BACKEND_URL;
const ENV_BASE = RAW && RAW !== 'undefined' ? RAW.replace(/\/$/, '') : '';
const BASE: string = ENV_BASE || PROD_BACKEND_URL;

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
    throw new Error(
      `Cannot reach API at ${fullUrl}. Check your internet connection or that the backend is online.`
    );
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    if (typeof data === 'string') {
      throw new Error(`API returned ${res.status} from ${fullUrl}.`);
    }
    const detail = (data && data.detail) || `Request failed (${res.status})`;
    throw new Error(detail);
  }
  return data;
}

export const api = {
  identify: (username: string) =>
    request('/auth/identify', { method: 'POST', body: JSON.stringify({ username }) }),
  rename: (name: string) =>
    request('/auth/rename', { method: 'POST', body: JSON.stringify({ name }) }, true),
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

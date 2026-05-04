import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
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
  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
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

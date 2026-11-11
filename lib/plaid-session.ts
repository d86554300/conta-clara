import { randomBytes } from 'node:crypto';
const state = globalThis as typeof globalThis & { plaidSessions?: Map<string, { token: string; expires: number }> };
export const sessions = state.plaidSessions ||= new Map();
export function saveSession(token: string) {
  sessions.forEach((s, id) => { if (s.expires < Date.now()) sessions.delete(id); });
  const id = randomBytes(32).toString('hex');
  sessions.set(id, { token, expires: Date.now() + 86400000 });
  return id;
}

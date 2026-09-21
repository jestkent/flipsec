export type PrivateSession = { token: string; expiresAt: number; threadId?: string };
const KEY = "flipsec:private-session";

export function savedSession(): PrivateSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (value && typeof value.token === "string" && /^[a-f0-9]{64}$/.test(value.token) &&
        typeof value.expiresAt === "number" && value.expiresAt > Date.now() &&
        (value.threadId === undefined || typeof value.threadId === "string")) return value;
  } catch { /* Private windows can disable storage. */ }
  return null;
}

export function saveSession(value: PrivateSession) {
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* Works until this tab closes. */ }
}

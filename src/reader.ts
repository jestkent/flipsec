// No accounts yet. A reader is a random id kept in their browser. Storage can
// throw in private windows, so fall back to an id for this tab.
const KEY = "flipsec:reader";
let cachedId: string | undefined;

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function readerId(): string {
  if (cachedId !== undefined) return cachedId;
  try {
    const stored = localStorage.getItem(KEY);
    if (stored !== null) {
      cachedId = stored;
      return stored;
    }
  } catch {
    // Storage is unavailable.
  }

  cachedId = newId();
  try {
    localStorage.setItem(KEY, cachedId);
  } catch {
    // The id still works for this tab.
  }
  return cachedId;
}

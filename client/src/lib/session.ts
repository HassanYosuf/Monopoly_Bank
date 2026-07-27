const STORAGE_KEY = "monopoly-bank-session";

export interface StoredSession {
  gameId: string;
  userToken: string;
  playerId: string;
  edition: string;
}

export function saveSession(session: StoredSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Private browsing / quota — resuming is a nicety, not a requirement.
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (
      typeof parsed.gameId === "string" &&
      typeof parsed.userToken === "string" &&
      typeof parsed.playerId === "string" &&
      typeof parsed.edition === "string"
    ) {
      return parsed as StoredSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

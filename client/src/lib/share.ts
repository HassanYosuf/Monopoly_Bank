// Join-link format is centralized here so pointing it at a real domain
// (or a backend-issued short link) in Stage 6 is a one-file change.
export function getJoinUrl(gameId: string): string {
  return `${window.location.origin}/join/${gameId}`;
}

export function parseJoinCodeFromLocation(): string | null {
  const match = window.location.pathname.match(/^\/join\/([0-9]{6})$/);
  return match ? match[1] : null;
}

interface ShareResult {
  method: "share" | "clipboard" | "failed";
}

export async function shareJoinLink(gameId: string, gameLabel: string): Promise<ShareResult> {
  const url = getJoinUrl(gameId);
  const text = `Join my ${gameLabel} game — code ${gameId}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: "Monopoly Bank", text, url });
      return { method: "share" };
    } catch {
      // User cancelled the native sheet — don't fall through to clipboard.
      return { method: "failed" };
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return { method: "clipboard" };
  } catch {
    return { method: "failed" };
  }
}

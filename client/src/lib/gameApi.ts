import type { IGameState } from "@monopoly-money/game-state";
import { SERVER_HTTP_URL } from "@/lib/serverConfig";

export interface JoinGameResponse {
  gameId: string;
  userToken: string;
  playerId: string;
  edition: string;
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function createGame(
  name: string,
  token: string,
  edition: string,
): Promise<JoinGameResponse> {
  const res = await fetch(`${SERVER_HTTP_URL}/api/game/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, token, edition }),
  });
  return parseJsonOrThrow<JoinGameResponse>(res);
}

export async function joinGame(
  gameId: string,
  name: string,
  token: string,
): Promise<JoinGameResponse> {
  const res = await fetch(`${SERVER_HTTP_URL}/api/game/${gameId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, token }),
  });
  return parseJsonOrThrow<JoinGameResponse>(res);
}

export async function fetchGameState(gameId: string, userToken: string): Promise<IGameState> {
  const res = await fetch(`${SERVER_HTTP_URL}/api/game/${gameId}`, {
    headers: { Authorization: userToken },
  });
  return parseJsonOrThrow<IGameState>(res);
}

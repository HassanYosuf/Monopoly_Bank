import { createClient } from "@supabase/supabase-js";
import { GameEvent } from "@monopoly-money/game-state";

// Persistence is optional: if these aren't set (e.g. local dev without a
// .env), the server just falls back to today's pure in-memory behaviour —
// games work exactly as before, they just don't survive a restart.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = url && key ? createClient(url, key) : null;

export const persistenceEnabled = supabase !== null;

if (!persistenceEnabled) {
  console.warn(
    "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — games will not survive a server restart."
  );
}

export async function persistGameCreated(gameId: string, edition: string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("games").insert({ id: gameId, edition });
    if (error) console.error("Failed to persist game creation", gameId, error.message);
  } catch (err) {
    console.error("Failed to persist game creation", gameId, err);
  }
}

export async function persistEvent(gameId: string, event: GameEvent): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from("game_events")
      .insert({ id: event.id, game_id: gameId, event });
    if (error) console.error("Failed to persist event", gameId, event.id, error.message);
  } catch (err) {
    console.error("Failed to persist event", gameId, event.id, err);
  }
}

export async function persistPlayerToken(
  gameId: string,
  userToken: string,
  playerId: string
): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from("game_player_tokens")
      .insert({ user_token: userToken, game_id: gameId, player_id: playerId });
    if (error) console.error("Failed to persist player token", gameId, playerId, error.message);
  } catch (err) {
    console.error("Failed to persist player token", gameId, playerId, err);
  }
}

export async function deleteGamePersistence(gameId: string): Promise<void> {
  if (!supabase) return;
  try {
    // game_events and game_player_tokens cascade-delete via their FK to games.
    const { error } = await supabase.from("games").delete().eq("id", gameId);
    if (error) console.error("Failed to delete persisted game", gameId, error.message);
  } catch (err) {
    console.error("Failed to delete persisted game", gameId, err);
  }
}

export interface PersistedGame {
  gameId: string;
  edition: string;
  events: GameEvent[];
  tokens: Array<{ userToken: string; playerId: string }>;
}

// Called once at boot to recover games that existed before a restart — the
// in-memory store starts empty every time, so without this every restart
// (including a host's idle spin-down) would silently end every in-progress
// game for its players.
export async function loadAllGames(): Promise<PersistedGame[]> {
  if (!supabase) return [];

  const { data: games, error: gamesError } = await supabase.from("games").select("id, edition");
  if (gamesError) {
    console.error("Failed to load persisted games", gamesError.message);
    return [];
  }
  if (!games || games.length === 0) return [];

  const { data: events, error: eventsError } = await supabase
    .from("game_events")
    .select("game_id, event")
    .order("seq", { ascending: true });
  if (eventsError) {
    console.error("Failed to load persisted events", eventsError.message);
    return [];
  }

  const { data: tokens, error: tokensError } = await supabase
    .from("game_player_tokens")
    .select("game_id, user_token, player_id");
  if (tokensError) {
    console.error("Failed to load persisted player tokens", tokensError.message);
    return [];
  }

  return games.map((g) => ({
    gameId: g.id,
    edition: g.edition,
    events: (events ?? []).filter((e) => e.game_id === g.id).map((e) => e.event as GameEvent),
    tokens: (tokens ?? [])
      .filter((t) => t.game_id === g.id)
      .map((t) => ({ userToken: t.user_token, playerId: t.player_id })),
  }));
}

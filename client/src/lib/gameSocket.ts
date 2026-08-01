import type { GameEvent } from "@monopoly-money/game-state";
import { SERVER_WS_URL } from "@/lib/serverConfig";

type IncomingMessage =
  | { type: "initialEventArray"; events: GameEvent[] }
  | { type: "newEvent"; event: GameEvent }
  | { type: "gameEnd" }
  | { type: "heartBeatAck" };

interface GameSocketHandlers {
  onInitialEvents: (events: GameEvent[]) => void;
  onNewEvent: (event: GameEvent) => void;
  onGameEnd: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onReconnecting?: () => void;
  /** Fired once retrying stops paying off — e.g. the server process itself
   * restarted, wiping its in-memory game store, so this gameId/userToken
   * will never become valid again no matter how many times we retry. */
  onGaveUp?: () => void;
}

// Sent by the server (see messageHandlers.ts) when it closes a socket
// because the gameId/userToken pair is not valid — as opposed to a plain
// network drop, which we should keep retrying. Both sides just need to
// agree on this number; there's no shared package to import it from.
const INVALID_SESSION_CLOSE_CODE = 4001;

const HEARTBEAT_MS = 20_000;
// A single failed connection's close/error events are enough to trigger one
// retry, but repeated failures in a short window get silently throttled by
// the browser (no further open/error/close events fire at all for a while).
// A chained setTimeout-on-close retry dies right there. Polling readyState
// independently sidesteps that — it doesn't matter whether the browser ever
// tells us a given attempt failed, we just keep checking until one opens.
const WATCHDOG_MS = 3000;
// ~1.5 minutes of retrying is generous for a real network blip (phone
// switching wifi/cell, laptop sleeping) but short enough that a user isn't
// left staring at "Reconnecting…" forever if the server genuinely lost the
// game (e.g. it restarted, which wipes its in-memory store by design).
const MAX_ATTEMPTS = 30;

export class GameSocket {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private intentionalClose = false;
  // A backgrounded mobile tab can leave `ws.readyState` reporting OPEN long
  // after the underlying connection has actually died (the OS suspends the
  // process without ever giving the browser a close event to fire) — so
  // readyState alone can't be trusted. Tracking whether the last heartbeat
  // actually got acked catches that: two misses in a row means the socket
  // is a zombie and needs to be force-closed so the watchdog reconnects it
  // for real, instead of every action against it silently going nowhere.
  private lastHeartbeatAcked = true;
  private failedAttempts = 0;
  private gameId: string | null = null;
  private userToken: string | null = null;
  private handlers: GameSocketHandlers;

  constructor(handlers: GameSocketHandlers) {
    this.handlers = handlers;
  }

  connect(gameId: string, userToken: string) {
    this.intentionalClose = false;
    this.gameId = gameId;
    this.userToken = userToken;
    this.failedAttempts = 0;
    this.open();

    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(() => {
      if (this.intentionalClose) return;
      const state = this.ws?.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;

      if (this.failedAttempts >= MAX_ATTEMPTS) {
        if (this.watchdogTimer) clearInterval(this.watchdogTimer);
        this.handlers.onGaveUp?.();
        return;
      }
      this.handlers.onReconnecting?.();
      this.open();
    }, WATCHDOG_MS);
  }

  private open() {
    if (!this.gameId || !this.userToken) return;
    const gameId = this.gameId;
    const userToken = this.userToken;

    const ws = new WebSocket(SERVER_WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", gameId, userToken }));
      this.failedAttempts = 0;
      this.lastHeartbeatAcked = true;
      this.handlers.onOpen?.();
      this.heartbeatTimer = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        if (!this.lastHeartbeatAcked) {
          // The previous heartbeat never got a reply — this connection is
          // dead even though readyState still says otherwise. Force it
          // closed so onclose/the watchdog take over a real reconnect.
          ws.close();
          return;
        }
        this.lastHeartbeatAcked = false;
        ws.send(JSON.stringify({ type: "heartBeat" }));
      }, HEARTBEAT_MS);
    };

    ws.onmessage = (raw) => {
      const message = JSON.parse(raw.data) as IncomingMessage;
      switch (message.type) {
        case "initialEventArray":
          // Sent fresh on every successful auth (including reconnects), so
          // this alone re-syncs any events missed while offline — no
          // separate reconciliation path needed.
          this.handlers.onInitialEvents(message.events);
          break;
        case "newEvent":
          this.handlers.onNewEvent(message.event);
          break;
        case "gameEnd":
          this.handlers.onGameEnd();
          break;
        case "heartBeatAck":
          this.lastHeartbeatAcked = true;
          break;
      }
    };

    ws.onclose = (event) => {
      this.failedAttempts += 1;
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

      if (event.code === INVALID_SESSION_CLOSE_CODE) {
        // This session will never become valid no matter how many times we
        // retry (the game doesn't exist, or this userToken isn't in it) —
        // stop immediately instead of burning through MAX_ATTEMPTS first.
        this.intentionalClose = true;
        if (this.watchdogTimer) clearInterval(this.watchdogTimer);
        this.handlers.onGaveUp?.();
        return;
      }

      this.handlers.onClose?.();
      // The watchdog (already running) picks up the retry from here — no
      // need to schedule anything from this handler.
    };
  }

  proposeEvent(event: GameEvent) {
    this.ws?.send(JSON.stringify({ type: "proposeEvent", event }));
  }

  proposeEndGame() {
    this.ws?.send(JSON.stringify({ type: "proposeEndGame" }));
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.ws?.close();
    this.ws = null;
    this.gameId = null;
    this.userToken = null;
  }
}

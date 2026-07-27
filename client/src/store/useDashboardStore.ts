import { create } from "zustand";
import { calculateGameState, defaultGameState, type GameEvent } from "@monopoly-money/game-state";
import type { EditionId } from "@/lib/locale";
import { EDITIONS } from "@/lib/locale";
import type { TokenId } from "@/components/icons/tokens";
import type { TransactionTypeId } from "@/lib/transactionTypes";
import { GameSocket } from "@/lib/gameSocket";
import { saveSession } from "@/lib/session";

export const BANK_ID = "bank";

export interface RuntimePlayer {
  id: string;
  name: string;
  token: TokenId;
  isBanker: boolean;
  balance: number;
  isOnline: boolean;
  isBankrupt: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionTypeId;
  fromId: string;
  toId: string;
  amount: number;
  memo: string;
  createdAt: number;
  createdBy: string;
  status: "pending" | "confirmed";
  disputed?: boolean;
}

interface SendTransactionInput {
  type: TransactionTypeId;
  fromId: string;
  toId: string;
  amount: number;
  memo: string;
}

interface ConnectParams {
  gameId: string;
  userToken: string;
  playerId: string;
  edition: EditionId;
}

interface DashboardState {
  gameId: string | null;
  edition: EditionId;
  players: RuntimePlayer[];
  selfId: string | null;
  bankBalance: number;
  transactions: Transaction[];
  isLocked: boolean;
  houses: number;
  hotels: number;
  startedAt: number | null;
  status: "active" | "ended";
  lastActivity: Record<string, number>;
  pulses: Record<string, "up" | "down">;
  connectionStatus: "connecting" | "connected" | "reconnecting" | "disconnected" | "lost";
  // True once the initial event log has actually been processed — the
  // socket's "connected" fires the instant the transport opens, which is
  // before the server has sent (or we've folded) any player data, so
  // navigation should wait on this too or it'll land on an empty Dashboard.
  hasSynced: boolean;

  connect: (params: ConnectParams) => void;
  disconnect: () => void;
  sendTransaction: (input: SendTransactionInput) => boolean;
  passGo: () => boolean;
  toggleLocked: () => boolean;
  adjustInventory: (kind: "houses" | "hotels", delta: number) => void;
  endGame: () => boolean;
  disputeTransaction: (id: string) => boolean;
  clearPulse: (playerId: string) => void;
  renameSelf: (name: string) => void;
}

function inferTransactionType(event: Extract<GameEvent, { type: "transaction" }>): TransactionTypeId {
  if (event.from === "bank") return "bank-payout";
  if (event.to === "bank") return "tax";
  return "custom";
}

// "freeParking" is a distinct sink in the server's model, but our UI has no
// concept of it — fold it into the same nominal "Bank" bucket for display.
function toDisplayEntity(entity: string): string {
  return entity === "freeParking" ? BANK_ID : entity;
}

function deriveFromEvents(rawEvents: GameEvent[]) {
  const gameState = calculateGameState(rawEvents, defaultGameState);

  const disputedIds = new Set(
    rawEvents
      .filter(
        (e): e is Extract<GameEvent, { type: "transactionDispute" }> =>
          e.type === "transactionDispute",
      )
      .map((e) => e.transactionEventId),
  );

  const transactions: Transaction[] = rawEvents
    .filter((e): e is Extract<GameEvent, { type: "transaction" }> => e.type === "transaction")
    .map((e) => ({
      id: e.id,
      type: (e.category as TransactionTypeId | undefined) ?? inferTransactionType(e),
      fromId: toDisplayEntity(e.from),
      toId: toDisplayEntity(e.to),
      amount: e.amount,
      memo: e.memo ?? "",
      createdAt: Date.parse(e.time),
      createdBy: e.actionedBy,
      status: "confirmed" as const,
      disputed: disputedIds.has(e.id),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);

  const players: RuntimePlayer[] = gameState.players.map((p) => ({
    id: p.playerId,
    name: p.name,
    token: (p.token as TokenId) || "hat",
    isBanker: p.banker,
    balance: p.balance,
    isOnline: p.connected,
    isBankrupt: p.balance < 0,
  }));

  return { gameState, transactions, players };
}

function eventBase(actionedBy: string) {
  return { id: crypto.randomUUID(), time: new Date().toISOString(), actionedBy };
}

// Module-scoped (not reactive state): one active connection per tab.
let socket: GameSocket | null = null;
let rawEvents: GameEvent[] = [];
const STARTING_CASH_MEMO = "Starting cash";
const paidOrPendingStartingCash = new Set<string>();

export const useDashboardStore = create<DashboardState>((set, get) => {
  // Only the banker's device may move money out of the bank (the server
  // enforces this too), so only it ever runs this — paying every player
  // their starting cash the moment they're seen for the first time,
  // exactly once, guarded against the async round-trip firing it twice.
  function maybePayStartingCash() {
    const state = get();
    const selfPlayer = state.players.find((p) => p.id === state.selfId);
    if (!selfPlayer?.isBanker || !state.selfId) return;

    const startingCash = EDITIONS[state.edition].startingCash;

    state.players.forEach((p) => {
      if (paidOrPendingStartingCash.has(p.id)) return;
      const alreadyPaid = state.transactions.some(
        (t) => t.toId === p.id && t.memo === STARTING_CASH_MEMO,
      );
      paidOrPendingStartingCash.add(p.id);
      if (alreadyPaid) return;

      const event: GameEvent = {
        ...eventBase(state.selfId!),
        type: "transaction",
        from: BANK_ID,
        to: p.id,
        amount: startingCash,
        category: "bank-payout",
        memo: STARTING_CASH_MEMO,
      };
      socket?.proposeEvent(event);
    });
  }

  function applyDerivedUpdate(isIncremental: boolean) {
    const prevPlayers = get().players;
    const { transactions, players, gameState } = deriveFromEvents(rawEvents);

    const pulses = { ...get().pulses };
    const lastActivity = { ...get().lastActivity };
    const now = Date.now();

    if (isIncremental) {
      players.forEach((p) => {
        const prev = prevPlayers.find((pp) => pp.id === p.id);
        if (prev && prev.balance !== p.balance) {
          pulses[p.id] = p.balance > prev.balance ? "up" : "down";
          lastActivity[p.id] = now;
        }
      });
    }

    // The real server treats bank money as infinite and never tracks a
    // balance for it — this is a cosmetic nominal figure only, folded from
    // the same event log so it moves in step with what's actually happened.
    // The seed is fixed (not scaled by current player count) so the number
    // only ever moves because of an actual transaction, never because
    // someone new joined the table.
    const seed = EDITIONS[get().edition].startingCash * 20;
    const bankBalance = transactions.reduce((total, t) => {
      if (t.toId === BANK_ID) return total + t.amount;
      if (t.fromId === BANK_ID) return total - t.amount;
      return total;
    }, seed);

    set({
      players,
      transactions,
      pulses,
      lastActivity,
      isLocked: !gameState.open,
      bankBalance,
      hasSynced: true,
    });

    maybePayStartingCash();
  }

  return {
    gameId: null,
    edition: "international",
    players: [],
    selfId: null,
    bankBalance: 0,
    transactions: [],
    isLocked: false,
    houses: 32,
    hotels: 12,
    startedAt: null,
    status: "active",
    lastActivity: {},
    pulses: {},
    connectionStatus: "disconnected",
    hasSynced: false,

    connect: ({ gameId, userToken, playerId, edition }) => {
      socket?.disconnect();
      rawEvents = [];
      paidOrPendingStartingCash.clear();
      // Persisted so a closed tab/app can resume this identity later,
      // instead of only being able to reconnect while still in memory.
      saveSession({ gameId, userToken, playerId, edition });

      set({
        gameId,
        edition,
        selfId: playerId,
        startedAt: Date.now(),
        status: "active",
        players: [],
        transactions: [],
        pulses: {},
        lastActivity: {},
        houses: 32,
        hotels: 12,
        bankBalance: 0,
        connectionStatus: "connecting",
        hasSynced: false,
      });

      socket = new GameSocket({
        onOpen: () => set({ connectionStatus: "connected" }),
        onClose: () => set({ connectionStatus: "disconnected" }),
        onReconnecting: () => set({ connectionStatus: "reconnecting" }),
        onGaveUp: () => set({ connectionStatus: "lost" }),
        onInitialEvents: (events) => {
          rawEvents = events;
          applyDerivedUpdate(false);
        },
        onNewEvent: (event) => {
          rawEvents = [...rawEvents, event];
          applyDerivedUpdate(true);
        },
        onGameEnd: () => set({ status: "ended" }),
      });
      socket.connect(gameId, userToken);
      if (import.meta.env.DEV) {
        (window as unknown as Record<string, unknown>).__gameSocket = socket;
      }
    },

    disconnect: () => {
      socket?.disconnect();
      socket = null;
      rawEvents = [];
      // Without this, "status" stays "ended" after a game concludes — the
      // App-level redirect that watches for "ended" would then bounce the
      // user straight back to the End Game Summary the instant they tried
      // to set up their next game.
      set({ status: "active" });
    },

    // Returns whether the event actually had a live connection to send
    // over — callers use this instead of assuming success, since a socket
    // that's mid-reconnect silently drops anything sent to it.
    sendTransaction: (input) => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return false;
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "transaction",
        from: input.fromId,
        to: input.toId,
        amount: input.amount,
        category: input.type,
        memo: input.memo,
      };
      socket?.proposeEvent(event);
      return true;
    },

    passGo: () => {
      const state = get();
      if (!state.selfId) return false;
      return state.sendTransaction({
        type: "bank-payout",
        fromId: BANK_ID,
        toId: state.selfId,
        amount: EDITIONS[state.edition].passGoAmount,
        memo: "Passed Go",
      });
    },

    toggleLocked: () => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return false;
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "gameOpenStateChange",
        open: state.isLocked,
      };
      socket?.proposeEvent(event);
      return true;
    },

    // Houses/hotels have no equivalent in the forked server's model and
    // are purely cosmetic counters — kept client-local rather than
    // extending the shared event schema for a non-money-moving display.
    adjustInventory: (kind, delta) =>
      set((s) => ({ [kind]: Math.max(0, s[kind] + delta) }) as Pick<DashboardState, typeof kind>),

    endGame: () => {
      if (get().connectionStatus !== "connected") return false;
      socket?.proposeEndGame();
      return true;
    },

    disputeTransaction: (id) => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return false;
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "transactionDispute",
        transactionEventId: id,
      };
      socket?.proposeEvent(event);
      return true;
    },

    clearPulse: (playerId) => {
      set((s) => {
        if (!s.pulses[playerId]) return s;
        const pulses = { ...s.pulses };
        delete pulses[playerId];
        return { pulses };
      });
    },

    renameSelf: (name) => {
      const state = get();
      if (!state.selfId || !name.trim()) return;
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "playerNameChange",
        playerId: state.selfId,
        name: name.trim(),
      };
      socket?.proposeEvent(event);
    },
  };
});

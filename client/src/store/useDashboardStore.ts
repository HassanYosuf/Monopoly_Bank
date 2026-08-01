import { create } from "zustand";
import { calculateGameState, defaultGameState, type GameEvent } from "@monopoly-money/game-state";
import type { EditionId } from "@/lib/locale";
import { EDITIONS } from "@/lib/locale";
import type { TokenId } from "@/components/icons/tokens";
import type { TransactionTypeId } from "@/lib/transactionTypes";
import { GameSocket } from "@/lib/gameSocket";
import { saveSession } from "@/lib/session";
import { propertyById, TOTAL_HOTELS, TOTAL_HOUSES } from "@/lib/properties";

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

export interface RuntimeProperty {
  propertyId: string;
  name: string;
  price: number;
  buildable: boolean;
  houseCost: number;
  ownerId: string | null;
  houses: number;
  hasHotel: boolean;
  mortgaged: boolean;
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

// A request for bank money that only becomes a real balance change once a
// banker approves it — see resolveMoneyRequest.
export interface MoneyRequest {
  id: string;
  type: TransactionTypeId;
  fromId: string;
  toId: string;
  amount: number;
  memo: string;
  requestedBy: string;
  requestedAt: number;
  status: "pending" | "approved" | "rejected";
  resolvedBy?: string;
}

interface SendMoneyRequestInput {
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
  moneyRequests: MoneyRequest[];
  isLocked: boolean;
  properties: Record<string, RuntimeProperty>;
  // Shared house-rule opt-outs — synced game state, not a per-device
  // setting, so every player agrees on what's actually in play.
  trackProperties: boolean;
  allowAuction: boolean;
  trackHousePrices: boolean;
  useFreeParking: boolean;
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
  sendMoneyRequest: (input: SendMoneyRequestInput) => boolean;
  // "already-resolved" happens when this request was approved/rejected
  // (by this banker or another) between the row rendering and the click
  // landing — real-world network latency makes that window big enough to
  // hit in practice, and it isn't an offline error, so callers should show
  // a distinct message for it rather than a generic failure.
  resolveMoneyRequest: (id: string, approved: boolean) => "sent" | "offline" | "already-resolved";
  passGo: () => boolean;
  toggleLocked: () => boolean;
  buyProperty: (propertyId: string, name: string) => boolean;
  // Buying with the "track properties" house rule off — no catalog slot to
  // pick from, so the property is named freehand and given a generated id.
  // Still recorded as owned, and — if a house price was given — can still
  // build/mortgage like a catalog property, so it shows up as a full card.
  buyCustomProperty: (
    name: string,
    amount: number,
    buildable: boolean,
    houseCost: number,
  ) => boolean;
  claimPropertyViaAuction: (propertyId: string, amount: number, name: string) => boolean;
  buildOnProperty: (propertyId: string) => boolean;
  sellBuildingOnProperty: (propertyId: string) => boolean;
  mortgageProperty: (propertyId: string) => boolean;
  unmortgageProperty: (propertyId: string) => boolean;
  // Relinquishes an already-mortgaged property back to the bank for $0 (the
  // owner already collected the mortgage payout) — it becomes unowned, so
  // whoever wants it next just goes through the normal buy/auction flow,
  // same as any other unowned square.
  giveUpProperty: (propertyId: string) => boolean;
  setTrackProperties: (value: boolean) => boolean;
  setAllowAuction: (value: boolean) => boolean;
  setTrackHousePrices: (value: boolean) => boolean;
  setFreeParkingJackpot: (value: boolean) => boolean;
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

  const moneyRequests: MoneyRequest[] = gameState.moneyRequests.map((r) => ({
    id: r.id,
    type: (r.category as TransactionTypeId | undefined) ?? "custom",
    fromId: toDisplayEntity(r.from),
    toId: toDisplayEntity(r.to),
    amount: r.amount,
    memo: r.memo ?? "",
    requestedBy: r.requestedBy,
    requestedAt: Date.parse(r.requestedAt),
    status: r.status,
    resolvedBy: r.resolvedBy,
  }));

  return {
    gameState,
    transactions,
    players,
    moneyRequests,
    properties: gameState.properties,
    trackProperties: gameState.trackProperties,
    allowAuction: gameState.allowAuction,
    trackHousePrices: gameState.trackHousePrices,
    useFreeParking: gameState.useFreeParking,
  };
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
    const {
      transactions,
      players,
      moneyRequests,
      gameState,
      properties,
      trackProperties,
      allowAuction,
      trackHousePrices,
      useFreeParking,
    } = deriveFromEvents(rawEvents);

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
      moneyRequests,
      pulses,
      lastActivity,
      isLocked: !gameState.open,
      bankBalance,
      properties,
      trackProperties,
      allowAuction,
      trackHousePrices,
      useFreeParking,
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
    moneyRequests: [],
    isLocked: false,
    properties: {},
    trackProperties: false,
    allowAuction: true,
    trackHousePrices: true,
    useFreeParking: true,
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
        moneyRequests: [],
        pulses: {},
        lastActivity: {},
        properties: {},
        trackProperties: false,
        allowAuction: true,
        trackHousePrices: true,
        useFreeParking: true,
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

    // Bank money never moves to a player directly off a self-serve click —
    // it always goes through a request a banker has to review. Approving
    // (see resolveMoneyRequest below) is what actually sends the real
    // "transaction" event that moves the balance.
    sendMoneyRequest: (input) => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return false;
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "moneyRequest",
        from: input.fromId,
        to: input.toId,
        amount: input.amount,
        category: input.type,
        memo: input.memo,
      };
      socket?.proposeEvent(event);
      return true;
    },

    // Only a banker is authorized to send this (enforced server-side too).
    // Rejecting just records the outcome; approving does too — the server
    // itself fires the actual bank -> player transaction as a trusted side
    // effect of processing the approval, so it can enforce "bank money into
    // your own account always needs this approval" for everyone, including
    // a banker approving their own request, without a client-sent
    // transaction needing a special exception to get through that rule.
    resolveMoneyRequest: (id, approved) => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return "offline";
      const request = state.moneyRequests.find((r) => r.id === id);
      if (!request || request.status !== "pending") return "already-resolved";

      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "moneyRequestResolution",
        requestId: id,
        approved,
      };
      socket?.proposeEvent(event);
      return "sent";
    },

    passGo: () => {
      const state = get();
      if (!state.selfId) return false;
      return state.sendMoneyRequest({
        type: "pass-go",
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

    buyProperty: (propertyId, name) => {
      const state = get();
      const trimmedName = name.trim();
      if (
        !state.selfId ||
        state.connectionStatus !== "connected" ||
        !state.trackProperties ||
        !trimmedName
      ) {
        return false;
      }
      const def = propertyById(state.edition, propertyId);
      if (!def) return false;
      if (state.properties[propertyId]?.ownerId) return false; // already owned

      state.sendTransaction({
        type: "buy-property",
        fromId: state.selfId,
        toId: BANK_ID,
        amount: def.price,
        memo: trimmedName,
      });
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "propertyStateChange",
        propertyId,
        name: trimmedName,
        price: def.price,
        buildable: def.buildable,
        houseCost: def.houseCost,
        ownerId: state.selfId,
        houses: 0,
        hasHotel: false,
        mortgaged: false,
      };
      socket?.proposeEvent(event);
      return true;
    },

    buyCustomProperty: (name, amount, buildable, houseCost) => {
      const state = get();
      const trimmedName = name.trim();
      if (
        !state.selfId ||
        state.connectionStatus !== "connected" ||
        !trimmedName ||
        amount <= 0 ||
        (buildable && houseCost <= 0)
      ) {
        return false;
      }

      state.sendTransaction({
        type: "buy-property",
        fromId: state.selfId,
        toId: BANK_ID,
        amount,
        memo: trimmedName,
      });
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "propertyStateChange",
        propertyId: `custom-${crypto.randomUUID()}`,
        name: trimmedName,
        price: amount,
        buildable,
        houseCost: buildable ? houseCost : 0,
        ownerId: state.selfId,
        houses: 0,
        hasHotel: false,
        mortgaged: false,
      };
      socket?.proposeEvent(event);
      return true;
    },

    // A property that was declined and auctioned off at the table — same
    // as buying, except the amount is whatever it went for (can be above or
    // below list price), entered by whoever's tracking the auction. Capped
    // at the claiming player's current balance — unlike rent/tax, an
    // auction bid is discretionary, so there's no legitimate case for
    // committing to more than you actually have on hand.
    claimPropertyViaAuction: (propertyId, amount, name) => {
      const state = get();
      const trimmedName = name.trim();
      const selfPlayer = state.players.find((p) => p.id === state.selfId);
      if (
        !state.selfId ||
        state.connectionStatus !== "connected" ||
        !state.trackProperties ||
        !state.allowAuction ||
        !trimmedName ||
        !selfPlayer ||
        amount > selfPlayer.balance
      ) {
        return false;
      }
      const def = propertyById(state.edition, propertyId);
      if (!def || amount <= 0) return false;
      if (state.properties[propertyId]?.ownerId) return false; // already owned

      state.sendTransaction({
        type: "buy-property",
        fromId: state.selfId,
        toId: BANK_ID,
        amount,
        memo: `${trimmedName} (auction)`,
      });
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "propertyStateChange",
        propertyId,
        name: trimmedName,
        price: def.price,
        buildable: def.buildable,
        houseCost: def.houseCost,
        ownerId: state.selfId,
        houses: 0,
        hasHotel: false,
        mortgaged: false,
      };
      socket?.proposeEvent(event);
      return true;
    },

    buildOnProperty: (propertyId) => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return false;
      const current = state.properties[propertyId];
      if (!current?.buildable) return false;
      if (current.ownerId !== state.selfId || current.hasHotel || current.mortgaged) {
        return false;
      }

      const nextHouses = current.houses < 4 ? current.houses + 1 : 0;
      const nextHasHotel = current.houses === 4;

      // The bank's houses/hotels are one shared pool across every property —
      // check availability against everyone else's buildings, not just this
      // one (the server enforces this for real; this just avoids a doomed
      // request and gives immediate UI feedback).
      const totals = Object.values(state.properties).reduce(
        (acc, p) => ({
          houses: acc.houses + p.houses,
          hotels: acc.hotels + (p.hasHotel ? 1 : 0),
        }),
        { houses: 0, hotels: 0 },
      );
      const housesElsewhere = totals.houses - current.houses;
      const hotelsElsewhere = totals.hotels - (current.hasHotel ? 1 : 0);
      if (housesElsewhere + nextHouses > TOTAL_HOUSES) return false;
      if (hotelsElsewhere + (nextHasHotel ? 1 : 0) > TOTAL_HOTELS) return false;

      state.sendTransaction({
        type: "buy-property",
        fromId: state.selfId,
        toId: BANK_ID,
        amount: current.houseCost,
        memo: nextHasHotel ? `Hotel — ${current.name}` : `House — ${current.name}`,
      });
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "propertyStateChange",
        propertyId,
        name: current.name,
        price: current.price,
        buildable: current.buildable,
        houseCost: current.houseCost,
        ownerId: current.ownerId,
        houses: nextHouses,
        hasHotel: nextHasHotel,
        mortgaged: false,
      };
      socket?.proposeEvent(event);
      return true;
    },

    sellBuildingOnProperty: (propertyId) => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return false;
      const current = state.properties[propertyId];
      if (!current || current.ownerId !== state.selfId) return false;
      if (current.houses === 0 && !current.hasHotel) return false; // nothing to sell

      const nextHouses = current.hasHotel ? 4 : current.houses - 1;
      const refund = Math.floor(current.houseCost / 2); // standard rule: half the build cost back

      state.sendTransaction({
        type: "mortgage",
        fromId: BANK_ID,
        toId: state.selfId,
        amount: refund,
        memo: current.hasHotel ? `Sold hotel — ${current.name}` : `Sold house — ${current.name}`,
      });
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "propertyStateChange",
        propertyId,
        name: current.name,
        price: current.price,
        buildable: current.buildable,
        houseCost: current.houseCost,
        ownerId: current.ownerId,
        houses: nextHouses,
        hasHotel: false,
        mortgaged: false,
      };
      socket?.proposeEvent(event);
      return true;
    },

    // Standard rule: a mortgaged property must have no houses/hotel on it,
    // pays out half its list price, and can't collect rent while mortgaged
    // (this app doesn't calculate rent automatically, so that part is just
    // on the players' honor, same as everything else money-related here).
    mortgageProperty: (propertyId) => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return false;
      const current = state.properties[propertyId];
      if (!current || current.ownerId !== state.selfId) return false;
      if (current.houses > 0 || current.hasHotel || current.mortgaged) return false;

      const mortgageValue = Math.floor(current.price / 2);
      state.sendTransaction({
        type: "mortgage",
        fromId: BANK_ID,
        toId: state.selfId,
        amount: mortgageValue,
        memo: `Mortgaged — ${current.name}`,
      });
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "propertyStateChange",
        propertyId,
        name: current.name,
        price: current.price,
        buildable: current.buildable,
        houseCost: current.houseCost,
        ownerId: current.ownerId,
        houses: 0,
        hasHotel: false,
        mortgaged: true,
      };
      socket?.proposeEvent(event);
      return true;
    },

    giveUpProperty: (propertyId) => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return false;
      const current = state.properties[propertyId];
      if (!current || !current.mortgaged) return false;
      const isBanker = state.players.find((p) => p.id === state.selfId)?.isBanker ?? false;
      if (current.ownerId !== state.selfId && !isBanker) return false;

      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "propertyStateChange",
        propertyId,
        name: current.name,
        price: current.price,
        buildable: current.buildable,
        houseCost: current.houseCost,
        ownerId: null,
        houses: 0,
        hasHotel: false,
        mortgaged: false,
      };
      socket?.proposeEvent(event);
      return true;
    },

    setTrackProperties: (value) => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return false;
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "trackPropertiesChange",
        trackProperties: value,
      };
      socket?.proposeEvent(event);
      return true;
    },

    setAllowAuction: (value) => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return false;
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "allowAuctionChange",
        allowAuction: value,
      };
      socket?.proposeEvent(event);
      return true;
    },

    setTrackHousePrices: (value) => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return false;
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "trackHousePricesChange",
        trackHousePrices: value,
      };
      socket?.proposeEvent(event);
      return true;
    },

    setFreeParkingJackpot: (value) => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return false;
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "useFreeParkingChange",
        useFreeParking: value,
      };
      socket?.proposeEvent(event);
      return true;
    },

    // Standard rule: pay back the mortgage value plus 10% interest to lift it.
    unmortgageProperty: (propertyId) => {
      const state = get();
      if (!state.selfId || state.connectionStatus !== "connected") return false;
      const current = state.properties[propertyId];
      if (!current || current.ownerId !== state.selfId || !current.mortgaged) return false;

      const payoff = Math.ceil((current.price / 2) * 1.1);
      state.sendTransaction({
        type: "mortgage",
        fromId: state.selfId,
        toId: BANK_ID,
        amount: payoff,
        memo: `Unmortgaged — ${current.name}`,
      });
      const event: GameEvent = {
        ...eventBase(state.selfId),
        type: "propertyStateChange",
        propertyId,
        name: current.name,
        price: current.price,
        buildable: current.buildable,
        houseCost: current.houseCost,
        ownerId: current.ownerId,
        houses: 0,
        hasHotel: false,
        mortgaged: false,
      };
      socket?.proposeEvent(event);
      return true;
    },

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

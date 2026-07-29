export type PlayerId = string;
export type GameEntity = "bank" | "freeParking" | PlayerId;

// Game state

export interface IGameStatePlayer {
  playerId: PlayerId;
  name: string;
  token: string;
  banker: boolean;
  balance: number;
  connected: boolean;
}

// A property with no entry in this map is unowned, with 0 houses and no
// hotel — entries only exist once a property's state first changes.
export interface IGameStateProperty {
  propertyId: string;
  // The name the buying player entered for this square — physical boards
  // vary too widely across editions/regions to hardcode, so every owned
  // property is named at purchase time rather than looked up from a catalog.
  name: string;
  // Face value the mortgage/unmortgage payout is calculated from — the
  // catalog price for a tracked-board property, or whatever was actually
  // paid for a freehand one (there's no printed price to fall back on).
  price: number;
  // Whether houses/hotels can go on this square at all (railroads/utilities
  // never can), and what one house costs — for a catalog property this
  // mirrors the fixed board data, for a freehand one it's whatever the
  // buyer entered (or "not buildable" if they skipped it).
  buildable: boolean;
  houseCost: number;
  ownerId: PlayerId | null;
  houses: number; // 0-4; a hotel replaces these, so houses is always 0 once hasHotel is true
  hasHotel: boolean;
  mortgaged: boolean;
}

export interface IGameState {
  edition: string;
  players: IGameStatePlayer[];
  properties: Record<string, IGameStateProperty>;
  useFreeParking: boolean;
  showOppositionBalances: boolean;
  freeParkingBalance: number;
  open: boolean;
  // House-rule opt-outs — shared across every player rather than a
  // per-device setting, since inconsistent devices would disagree about
  // what's even allowed.
  trackProperties: boolean;
  allowAuction: boolean;
  // Whether buying a freehand (untracked) property also asks for a
  // per-house build price, so houses/hotels can still be tracked for it.
  // Irrelevant when trackProperties is on — catalog properties already
  // carry a fixed house cost.
  trackHousePrices: boolean;
  // Flips true once the banker taps "Start Game" — gates the automatic
  // starting-cash payout so it waits for any per-player overrides to be
  // set during setup instead of firing the instant a player joins the lobby.
  started: boolean;
  // Per-player starting cash, set by the banker during setup. A player with
  // no entry here gets the edition's default when they're paid out.
  startingCashOverrides: Record<PlayerId, number>;
}

// Game events

export type GameEvent =
  | IPlayerJoinEvent
  | IPlayerDeleteEvent
  | IPlayerNameChangeEvent
  | IPlayerBankerStatusChangeEvent
  | ITransactionEvent
  | ITransactionDisputeEvent
  | IGameOpenStateChangeEvent
  | IUseFreeParkingChangeEvent
  | IShowOppositionBalancesChangeEvent
  | IPlayerConnectionChangeEvent
  | IPropertyStateChangeEvent
  | ITrackPropertiesChangeEvent
  | IAllowAuctionChangeEvent
  | ITrackHousePricesChangeEvent
  | IGameStartedEvent
  | IPlayerStartingCashChangeEvent;

export interface IGameEvent {
  id: string;
  time: string; // ISO string
  actionedBy: PlayerId;
}

export interface IPlayerJoinEvent extends IGameEvent {
  type: "playerJoin";
  playerId: PlayerId;
  name: string;
  token: string;
}

export interface IPlayerDeleteEvent extends IGameEvent {
  type: "playerDelete";
  playerId: PlayerId;
}

export interface IPlayerNameChangeEvent extends IGameEvent {
  type: "playerNameChange";
  playerId: PlayerId;
  name: string;
}

export interface IPlayerBankerStatusChangeEvent extends IGameEvent {
  type: "playerBankerStatusChange";
  playerId: PlayerId;
  isBanker: boolean;
}

export interface ITransactionEvent extends IGameEvent {
  type: "transaction";
  from: GameEntity;
  to: GameEntity;
  amount: number;
  category?: string;
  memo?: string;
}

export interface ITransactionDisputeEvent extends IGameEvent {
  type: "transactionDispute";
  transactionEventId: string;
}

export interface IGameOpenStateChangeEvent extends IGameEvent {
  type: "gameOpenStateChange";
  open: boolean;
}

export interface IUseFreeParkingChangeEvent extends IGameEvent {
  type: "useFreeParkingChange";
  useFreeParking: boolean;
}

export interface IShowOppositionBalancesChangeEvent extends IGameEvent {
  type: "showOppositionBalancesChange";
  showOppositionBalances: boolean;
}

export interface IPlayerConnectionChangeEvent extends IGameEvent {
  type: "playerConnectionChange";
  playerId: PlayerId;
  connected: boolean;
}

// A full replace of one property's state rather than granular
// buy/build/sell events — simplest to reason about and to authorize (see
// messageHandlers.ts), mirroring IPlayerBankerStatusChangeEvent's approach.
export interface IPropertyStateChangeEvent extends IGameEvent {
  type: "propertyStateChange";
  propertyId: string;
  name: string;
  price: number;
  buildable: boolean;
  houseCost: number;
  ownerId: PlayerId | null;
  houses: number;
  hasHotel: boolean;
  mortgaged: boolean;
}

export interface ITrackPropertiesChangeEvent extends IGameEvent {
  type: "trackPropertiesChange";
  trackProperties: boolean;
}

export interface IAllowAuctionChangeEvent extends IGameEvent {
  type: "allowAuctionChange";
  allowAuction: boolean;
}

export interface ITrackHousePricesChangeEvent extends IGameEvent {
  type: "trackHousePricesChange";
  trackHousePrices: boolean;
}

export interface IGameStartedEvent extends IGameEvent {
  type: "gameStarted";
}

export interface IPlayerStartingCashChangeEvent extends IGameEvent {
  type: "playerStartingCashChange";
  playerId: PlayerId;
  amount: number;
}

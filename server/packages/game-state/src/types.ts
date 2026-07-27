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
  | IAllowAuctionChangeEvent;

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

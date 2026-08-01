import { GameEvent } from "@monopoly-money/game-state";

// REST HTTP Types

export interface ICreateGameRequest {
  name: string;
  token: string;
  edition: string;
}

export interface IJoinGameRequest {
  name: string;
  token: string;
}

export interface IJoinGameResponse {
  gameId: string;
  userToken: string; // An auth token is used to identify a user
  playerId: string; // Tell the player who they are (not required when making calls)
  edition: string; // Set once at game creation; not derivable from the event log
}

// Websocket Incoming Message Types (server <= client)

export type IncomingMessage =
  | IAuthMessage
  | IProposeEventMessage
  | IProposeEndGameMessage
  | IHeartBeatMessage;

export interface IAuthMessage {
  type: "auth";
  gameId: string;
  userToken: string;
}

export interface IProposeEventMessage {
  type: "proposeEvent";
  event: GameEvent;
}

export interface IProposeEndGameMessage {
  type: "proposeEndGame";
}

export interface IHeartBeatMessage {
  type: "heartBeat";
}

// Websocket Outgoing Message Types (server => client)

export type OutgoingMessage =
  | IInitialEventArrayMessage
  | INewEventMessage
  | IGameEndMessage
  | IHeartBeatAckMessage;

export interface IInitialEventArrayMessage {
  type: "initialEventArray";
  events: GameEvent[];
}

export interface INewEventMessage {
  type: "newEvent";
  event: GameEvent;
}

export interface IGameEndMessage {
  type: "gameEnd";
}

// Lets the client tell a truly-dead connection apart from one that merely
// *looks* open — see gameSocket.ts on the client for why readyState alone
// isn't enough.
export interface IHeartBeatAckMessage {
  type: "heartBeatAck";
}

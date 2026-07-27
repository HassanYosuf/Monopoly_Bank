import * as websocket from "ws";
import gameStore from "../../gameStore";
import { IncomingMessage } from "../dto";
import { IUserData } from "../types";

// Sent to the client so it can tell "this session will never work" apart
// from a plain network drop worth retrying — see gameSocket.ts on the client.
const INVALID_SESSION_CLOSE_CODE = 4001;

// Physical piece counts in a standard Monopoly set, shared across the whole
// board — duplicated from client/src/lib/properties.ts since there's no
// shared package for edition/property data, only game-state's event shapes.
const TOTAL_HOUSES = 32;
const TOTAL_HOTELS = 12;

const isAuthenticated = (ws: websocket, { gameId, userToken }: IUserData): boolean => {
  // If the user has not sent an IAuthMessage
  if (gameId === null || userToken === null) {
    ws.close(INVALID_SESSION_CLOSE_CODE, "invalid-session");
    return false;
  }
  // If the game does no longer exist
  if (!gameStore.doesGameExist(gameId)) {
    ws.close(INVALID_SESSION_CLOSE_CODE, "invalid-session");
    return false;
  }
  // If user is not in the game
  const game = gameStore.getGame(gameId);
  if (!game.isUserInGame(userToken)) {
    ws.close(INVALID_SESSION_CLOSE_CODE, "invalid-session");
    return false;
  }
  return true;
};

export const onMessageStreamClosed = (ws: websocket, userData: IUserData) => {
  if (userData.gameId !== null && userData.userToken !== null && isAuthenticated(ws, userData)) {
    const game = gameStore.getGame(userData.gameId);
    const playerId = game.getPlayerId(userData.userToken);
    game.removePlayerWebSocket(playerId);

    // Tell the game that this player is now disconnected
    game.playerConnectionStatusChange(playerId, false);
  }
};

export type MessageHandler = (ws: websocket, userData: IUserData, message: IncomingMessage) => void;

export const authMessage: MessageHandler = (ws, userData, message) => {
  if (message.type === "auth") {
    // If the game does no longer exist or the user is not in the game, end the connection
    if (!gameStore.doesGameExist(message.gameId)) {
      ws.close(INVALID_SESSION_CLOSE_CODE, "invalid-session");
      return;
    }
    const game = gameStore.getGame(message.gameId);
    if (!game.isUserInGame(message.userToken)) {
      ws.close(INVALID_SESSION_CLOSE_CODE, "invalid-session");
      return;
    }

    // Setup user data
    userData.gameId = message.gameId;
    userData.userToken = message.userToken;

    // Subscribe this websocket to game events
    const playerId = game.getPlayerId(userData.userToken);
    game.subscribeWebSocketToEvents(ws, playerId);
  }
};

export const proposeEvent: MessageHandler = (ws, { gameId, userToken }, message) => {
  if (message.type === "proposeEvent") {
    if (!isAuthenticated(ws, { gameId, userToken })) {
      return;
    }
    if (gameId === null || userToken === null) {
      throw new Error("Invalid state. proposeEvent continued when gameId/userToken is null");
    }
    const game = gameStore.getGame(gameId);
    const isPlayerBanker = game.isUserABanker(userToken);
    const playerId = game.getPlayerId(userToken);
    const event = message.event;

    // Authorization filtering
    switch (event.type) {
      case "transaction":
        if (event.amount <= 0) {
          return; // All transactions must have an amount greater than 0
        }
        if (
          (event.from === "bank" || event.from === "freeParking") &&
          !isPlayerBanker &&
          !(event.from === "bank" && event.to === playerId)
        ) {
          return; // Only bankers can send money from the bank or free parking,
          // except a player collecting their own Pass Go payout from the bank
        } else if (
          event.from !== "bank" &&
          event.from !== "freeParking" &&
          event.from !== playerId &&
          !isPlayerBanker
        ) {
          return; // If a user is not a banker, they cannot send money from anyone but themselves
        }
        break;
      case "playerNameChange":
        if (!isPlayerBanker && playerId !== event.playerId) {
          return; // Only a banker or the modified player can change their name
        }
        break;
      case "playerDelete":
        if (!isPlayerBanker && playerId !== event.playerId) {
          return; // Only a banker or the player themselves can remove a player from the game
        }
        break;
      case "playerConnectionChange":
        if (event.playerId !== playerId) {
          return; // Players can only update their own connection status
        }
        break;
      case "playerBankerStatusChange":
        if (!isPlayerBanker) {
          return; // Only an existing banker can grant or revoke banker status
        }
        break;
      case "propertyStateChange": {
        if (event.houses < 0 || event.houses > 4) {
          return; // Houses must be between 0 and 4 — a hotel replaces them
        }
        if (event.hasHotel && event.houses !== 0) {
          return; // A hotel replaces the 4 houses; they can't coexist
        }
        if (event.mortgaged && (event.houses > 0 || event.hasHotel)) {
          return; // Can't have buildings on a mortgaged property
        }

        const gameState = game.getGameState();
        if (!gameState.trackProperties) {
          return; // This game has opted out of structured property tracking
        }
        const currentOwner = gameState.properties[event.propertyId]?.ownerId ?? null;
        const isSelf = event.ownerId === playerId;
        const isCurrentOwner = currentOwner === playerId;
        if (!isPlayerBanker && !isSelf && !isCurrentOwner) {
          return; // Only a banker can change a property you don't own and aren't claiming for yourself
        }

        // Enforce the physical piece limit shared across the whole board.
        const others = Object.values(gameState.properties).filter(
          (p) => p.propertyId !== event.propertyId
        );
        const housesElsewhere = others.reduce((sum, p) => sum + p.houses, 0);
        const hotelsElsewhere = others.filter((p) => p.hasHotel).length;
        if (housesElsewhere + event.houses > TOTAL_HOUSES) {
          return; // Not enough houses left in the bank
        }
        if (hotelsElsewhere + (event.hasHotel ? 1 : 0) > TOTAL_HOTELS) {
          return; // Not enough hotels left in the bank
        }
        break;
      }
      case "trackPropertiesChange":
      case "allowAuctionChange":
        if (!isPlayerBanker) {
          return; // Only the banker can change house rules
        }
        break;
    }

    game.addEvent(event, playerId);
  }
};

export const proposeEndGame: MessageHandler = (ws, { gameId, userToken }, message) => {
  if (message.type === "proposeEndGame") {
    if (!isAuthenticated(ws, { gameId, userToken })) {
      return;
    }
    if (gameId === null || userToken === null) {
      throw new Error("Invalid state. proposeEndGame continued when gameId/userToken is null");
    }
    const game = gameStore.getGame(gameId);
    const isPlayerBanker = game.isUserABanker(userToken);

    if (isPlayerBanker) {
      game.endGame();
    }
  }
};

export const heartBeat: MessageHandler = (ws, { gameId, userToken }, message) => {
  if (message.type === "heartBeat") {
    // No operations required
    return;
  }
};

import * as websocket from "ws";
import { GameEvent } from "@monopoly-money/game-state";
import gameStore from "../../gameStore";
import { IHeartBeatAckMessage, IncomingMessage } from "../dto";
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

    // Handled before the generic switch/addEvent below because approving a
    // request has to add *two* events (the resolution, then — if approved —
    // the actual transaction that moves the balance) rather than one, and
    // that follow-up transaction is server-generated and never re-enters
    // the "transaction" authorization case below. It can't: that case now
    // unconditionally blocks any bank money a player sends to themselves
    // (see below), specifically so nobody — including a banker — has a
    // client-side shortcut around this approval step. The transaction this
    // produces is trusted because it only ever fires as a direct result of
    // an approval that already passed its own check just above it.
    if (event.type === "moneyRequestResolution") {
      if (!isPlayerBanker) {
        return; // Only a banker can approve or reject a money request
      }
      const request = game.getGameState().moneyRequests.find((r) => r.id === event.requestId);
      if (!request || request.status !== "pending") {
        return; // Unknown, or already resolved by this or another click —
        // also what keeps a duplicate/late-arriving resolution from
        // re-firing the transaction below a second time.
      }

      game.addEvent(event, playerId);
      if (event.approved) {
        // id/time/actionedBy are placeholders — addEvent overwrites all
        // three unconditionally, they just need to satisfy GameEvent's shape.
        game.addEvent(
          {
            id: "",
            time: "",
            actionedBy: playerId,
            type: "transaction",
            from: request.from,
            to: request.to,
            amount: request.amount,
            category: request.category,
            memo: request.memo
          } as GameEvent,
          playerId
        );
      }
      return;
    }

    // Authorization filtering
    switch (event.type) {
      case "transaction": {
        if (event.amount <= 0) {
          return; // All transactions must have an amount greater than 0
        }
        const isBankSourced = event.from === "bank" || event.from === "freeParking";
        const isSelfTargeted = event.to === playerId;
        if (
          isBankSourced &&
          isSelfTargeted &&
          !(event.from === "bank" && event.category === "mortgage")
        ) {
          return; // Bank money into your own account always needs a
          // banker's explicit approval via a moneyRequest — even if you
          // are the banker — except a rule-validated mortgage/build
          // payout. No transaction type (Custom, Bank Payout, Manual
          // Adjustment, ...) gets a shortcut around this.
        }
        if (isBankSourced && !isPlayerBanker) {
          return; // Only bankers can send money from the bank or free parking to someone else
        }
        if (!isBankSourced && event.from !== playerId && !isPlayerBanker) {
          return; // If a user is not a banker, they cannot send money from anyone but themselves
        }
        break;
      }
      case "moneyRequest":
        if (event.amount <= 0) {
          return; // All requests must have an amount greater than 0
        }
        if (event.to !== playerId) {
          return; // Players can only request money for themselves
        }
        if (event.from !== "bank" && event.from !== "freeParking") {
          return; // Requests only exist for bank/free-parking money right now
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
        if (!event.name || !event.name.trim()) {
          return; // Every owned property must be named — no blank placeholders
        }
        if (event.price < 0 || event.houseCost < 0) {
          return; // Mortgage/build values are derived from these — can't be negative
        }
        if (event.houses < 0 || event.houses > 4) {
          return; // Houses must be between 0 and 4 — a hotel replaces them
        }
        if (event.hasHotel && event.houses !== 0) {
          return; // A hotel replaces the 4 houses; they can't coexist
        }
        if ((event.houses > 0 || event.hasHotel) && !event.buildable) {
          return; // Can't build on a property that isn't buildable (railroads/
          // utilities, or a freehand property bought without a house price)
        }
        if (event.mortgaged && (event.houses > 0 || event.hasHotel)) {
          return; // Can't have buildings on a mortgaged property
        }

        const gameState = game.getGameState();
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
      case "trackHousePricesChange":
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
    // The client uses this to tell a truly-dead connection apart from one
    // that merely still reports an OPEN readyState (e.g. a mobile tab
    // backgrounded long enough for the underlying connection to die
    // without the browser ever firing a close event) — see gameSocket.ts.
    const ack: IHeartBeatAckMessage = { type: "heartBeatAck" };
    ws.send(JSON.stringify(ack));
  }
};

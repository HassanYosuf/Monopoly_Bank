import { GameEvent, IGameState } from "./types";

export const defaultGameState: IGameState = {
  edition: "international",
  players: [],
  properties: {},
  useFreeParking: true,
  showOppositionBalances: true,
  freeParkingBalance: 0,
  open: true,
  trackProperties: false,
  allowAuction: true,
  trackHousePrices: true
};

export const calculateGameState = (events: GameEvent[], currentState: IGameState): IGameState => {
  return events.reduce((state: IGameState, event: GameEvent) => {
    switch (event.type) {
      case "playerJoin":
        return {
          ...state,
          players: [
            ...state.players,
            {
              playerId: event.playerId,
              name: event.name,
              token: event.token,
              banker: false,
              balance: 0,
              connected: false
            }
          ]
        };

      case "playerDelete":
        return {
          ...state,
          players: state.players.filter((p) => p.playerId !== event.playerId),
          // Their properties return to the bank rather than staying "owned"
          // by someone no longer in the game.
          properties: Object.keys(state.properties).reduce((acc, id) => {
            const property = state.properties[id];
            acc[id] =
              property.ownerId === event.playerId
                ? { ...property, ownerId: null, houses: 0, hasHotel: false, mortgaged: false }
                : property;
            return acc;
          }, {} as IGameState["properties"])
        };

      case "playerNameChange":
        return {
          ...state,
          players: state.players.map((p) =>
            p.playerId === event.playerId
              ? {
                  ...p,
                  name: event.name
                }
              : p
          )
        };

      case "playerBankerStatusChange":
        return {
          ...state,
          players: state.players.map((p) =>
            p.playerId === event.playerId
              ? {
                  ...p,
                  banker: event.isBanker
                }
              : p
          )
        };

      case "transaction":
        if (event.from === "bank" || event.from === "freeParking") {
          const destinationPlayer = state.players.find((p) => p.playerId === event.to);
          if (destinationPlayer === undefined) {
            throw new Error("Unable to find destination player");
          }
          return {
            ...state,
            players: [
              ...state.players.filter((p) => p.playerId !== event.from && p.playerId !== event.to),
              {
                ...destinationPlayer,
                balance: destinationPlayer.balance + event.amount
              }
            ],
            freeParkingBalance:
              event.from === "freeParking"
                ? state.freeParkingBalance - event.amount
                : state.freeParkingBalance
          };
        } else if (event.to === "bank" || event.to === "freeParking") {
          const sourcePlayer = state.players.find((p) => p.playerId === event.from);
          if (sourcePlayer === undefined) {
            throw new Error("Unable to find source player");
          }
          return {
            ...state,
            players: [
              ...state.players.filter((p) => p.playerId !== event.from && p.playerId !== event.to),
              {
                ...sourcePlayer,
                balance: sourcePlayer.balance - event.amount
              }
            ],
            freeParkingBalance:
              event.to === "freeParking"
                ? state.freeParkingBalance + event.amount
                : state.freeParkingBalance
          };
        } else {
          const sourcePlayer = state.players.find((p) => p.playerId === event.from);
          const destinationPlayer = state.players.find((p) => p.playerId === event.to);
          if (sourcePlayer === undefined || destinationPlayer === undefined) {
            throw new Error("Unable to find source or destination player");
          }
          return {
            ...state,
            players: [
              ...state.players.filter((p) => p.playerId !== event.from && p.playerId !== event.to),
              {
                ...sourcePlayer,
                balance: sourcePlayer.balance - event.amount
              },
              {
                ...destinationPlayer,
                balance: destinationPlayer.balance + event.amount
              }
            ]
          };
        }
      case "transactionDispute":
        // Disputes are an annotation on a transaction, not a balance change —
        // clients derive a disputed-set from the raw event log themselves.
        return state;

      case "gameOpenStateChange":
        return {
          ...state,
          open: event.open
        };

      case "useFreeParkingChange":
        return {
          ...state,
          useFreeParking: event.useFreeParking
        };

      case "showOppositionBalancesChange":
        return {
          ...state,
          showOppositionBalances: event.showOppositionBalances
        };

      case "playerConnectionChange":
        return {
          ...state,
          players: [
            ...state.players.filter((p) => p.playerId !== event.playerId),
            {
              ...state.players.find((p) => p.playerId === event.playerId)!,
              connected: event.connected
            }
          ]
        };

      case "propertyStateChange":
        return {
          ...state,
          properties: {
            ...state.properties,
            [event.propertyId]: {
              propertyId: event.propertyId,
              name: event.name,
              price: event.price,
              buildable: event.buildable,
              houseCost: event.houseCost,
              ownerId: event.ownerId,
              houses: event.houses,
              hasHotel: event.hasHotel,
              mortgaged: event.mortgaged
            }
          }
        };

      case "trackPropertiesChange":
        return {
          ...state,
          trackProperties: event.trackProperties
        };

      case "allowAuctionChange":
        return {
          ...state,
          allowAuction: event.allowAuction
        };

      case "trackHousePricesChange":
        return {
          ...state,
          trackHousePrices: event.trackHousePrices
        };
    }
  }, currentState);
};

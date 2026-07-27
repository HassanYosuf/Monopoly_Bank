import Game from "./Game";
import { createUniqueGameId } from "./utils";
import { loadAllGames, persistGameCreated } from "../persistence/supabase";

class GameStore {
  private games: Record<string, Game> = {};

  public createGame(initialBankersName: string, initialBankersToken: string, edition: string) {
    // Generate a game id
    const gameId = createUniqueGameId(Object.keys(this.games));

    // Create the game
    const deleteInstance = () => this.deleteGame(gameId);
    this.games[gameId] = new Game(gameId, deleteInstance, edition);
    void persistGameCreated(gameId, edition);

    // Add the user that created this game and set them as a banker
    const game = this.games[gameId];
    const { userToken, playerId } = game.addPlayer(initialBankersName, initialBankersToken);
    game.setPlayerBankerStatus(playerId, true, playerId);

    // Return the new game id and the users userToken
    return { gameId, userToken, playerId };
  }

  public doesGameExist(gameId: string) {
    return gameId in this.games;
  }

  public getGame(gameId: string) {
    return this.games[gameId];
  }

  public deleteGame(gameId: string) {
    delete this.games[gameId];
  }

  // Recovers games that existed before a restart — the in-memory store
  // above starts empty every time the process boots, so without this every
  // restart (including a host's idle spin-down) would silently end every
  // in-progress game for its players. Called once before the server starts
  // accepting connections; everything else stays synchronous/in-memory.
  public async rehydrate(): Promise<number> {
    const persisted = await loadAllGames();
    persisted.forEach(({ gameId, edition, events, tokens }) => {
      const deleteInstance = () => this.deleteGame(gameId);
      const game = new Game(gameId, deleteInstance, edition);
      game.restoreFromPersistence(events, tokens);
      this.games[gameId] = game;
    });
    return persisted.length;
  }
}

export default new GameStore();

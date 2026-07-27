import { create } from "zustand";
import type { EditionId } from "@/lib/locale";
import type { TokenId } from "@/components/icons/tokens";
import { createGame, joinGame } from "@/lib/gameApi";
import { useDashboardStore } from "@/store/useDashboardStore";
import { clearSession } from "@/lib/session";

// The server's plain-text error bodies are meant for API consumers, not
// players at a table — translate the ones we know about into copy that
// actually tells someone what to do next.
function friendlyJoinError(message: string): string {
  if (message === "Game does not exist") {
    return "That game code doesn't exist — double-check it with the banker.";
  }
  if (message === "Game is not open") {
    return "This game has been locked by the banker — ask them to let you in.";
  }
  if (message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network")) {
    return "Couldn't reach the server — check your connection and try again.";
  }
  return "Couldn't join that game — try again.";
}

export type Screen =
  | "landing"
  | "resuming"
  | "join"
  | "join-details"
  | "join-waiting"
  | "create"
  | "create-details"
  | "setup"
  | "dashboard"
  | "ledger"
  | "properties"
  | "player-detail"
  | "banker-console"
  | "end-game";

export interface RulesConfig {
  freeParkingJackpot: boolean;
  speedDie: boolean;
}

interface GameState {
  screen: Screen;
  joinCode: string;
  joinError: string | null;
  createError: string | null;
  identityName: string;
  identityToken: TokenId;
  edition: EditionId;
  gameId: string | null;
  userToken: string | null;
  selectedPlayerId: string | null;
  rules: RulesConfig;
  isCreating: boolean;
  isJoining: boolean;

  goTo: (screen: Screen) => void;
  setJoinCode: (code: string) => void;
  submitJoinCode: (code: string) => void;
  setIdentityName: (name: string) => void;
  setIdentityToken: (token: TokenId) => void;
  confirmJoin: () => Promise<void>;
  selectEdition: (edition: EditionId) => void;
  startCreate: () => void;
  confirmCreate: () => Promise<void>;
  updateRule: <K extends keyof RulesConfig>(key: K, value: RulesConfig[K]) => void;
  viewPlayer: (id: string) => void;
  resetToLanding: () => void;
}

const initialRules: RulesConfig = { freeParkingJackpot: true, speedDie: false };

export const useGameStore = create<GameState>((set, get) => ({
  screen: "landing",
  joinCode: "",
  joinError: null,
  createError: null,
  identityName: "",
  identityToken: "hat",
  edition: "international",
  gameId: null,
  userToken: null,
  selectedPlayerId: null,
  rules: initialRules,
  isCreating: false,
  isJoining: false,

  goTo: (screen) => set({ screen }),

  setJoinCode: (code) => set({ joinCode: code, joinError: null }),

  submitJoinCode: (code) => {
    if (code.length < 6) {
      set({ joinError: "Enter all 6 digits" });
      return;
    }
    set({ joinError: null, gameId: code, screen: "join-details" });
  },

  setIdentityName: (name) => set({ identityName: name }),

  setIdentityToken: (token) => set({ identityToken: token }),

  confirmJoin: async () => {
    const { gameId, identityName, identityToken } = get();
    if (!gameId || !identityName.trim() || get().isJoining) return;
    set({ isJoining: true, joinError: null });
    try {
      const res = await joinGame(gameId, identityName.trim(), identityToken);
      useDashboardStore.getState().connect({
        gameId: res.gameId,
        userToken: res.userToken,
        playerId: res.playerId,
        edition: res.edition as EditionId,
      });
      set({ userToken: res.userToken, edition: res.edition as EditionId, screen: "join-waiting" });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      set({ joinError: friendlyJoinError(raw) });
    } finally {
      set({ isJoining: false });
    }
  },

  selectEdition: (edition) =>
    set({
      edition,
      rules: { ...get().rules, speedDie: edition === "india" ? get().rules.speedDie : false },
    }),

  startCreate: () => set({ screen: "create-details" }),

  confirmCreate: async () => {
    const { identityName, identityToken, edition } = get();
    if (!identityName.trim() || get().isCreating) return;
    set({ isCreating: true, createError: null });
    try {
      const res = await createGame(identityName.trim(), identityToken, edition);
      useDashboardStore.getState().connect({
        gameId: res.gameId,
        userToken: res.userToken,
        playerId: res.playerId,
        edition: res.edition as EditionId,
      });
      set({
        gameId: res.gameId,
        userToken: res.userToken,
        edition: res.edition as EditionId,
        screen: "setup",
      });
    } catch {
      set({ createError: "Couldn't reach the server — check your connection and try again." });
    } finally {
      set({ isCreating: false });
    }
  },

  updateRule: (key, value) => set((state) => ({ rules: { ...state.rules, [key]: value } })),

  viewPlayer: (id) => set({ selectedPlayerId: id, screen: "player-detail" }),

  resetToLanding: () => {
    useDashboardStore.getState().disconnect();
    clearSession();
    set({
      screen: "landing",
      joinCode: "",
      joinError: null,
      createError: null,
      identityName: "",
      identityToken: "hat",
      gameId: null,
      userToken: null,
      selectedPlayerId: null,
      rules: initialRules,
    });
  },
}));

import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { Moon, Sun } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { JoinCreateGame } from "@/screens/JoinCreateGame";
import { GameSetup } from "@/screens/GameSetup";
import { Dashboard } from "@/screens/Dashboard";
import { Ledger } from "@/screens/Ledger";
import { Properties } from "@/screens/Properties";
import { PlayerDetail } from "@/screens/PlayerDetail";
import { BankerConsole } from "@/screens/BankerConsole";
import { EndGameSummary } from "@/screens/EndGameSummary";
import { ConnectionBanner } from "@/components/dashboard/ConnectionBanner";
import { applyTheme, getInitialTheme, type Theme } from "@/lib/theme";
import { parseJoinCodeFromLocation } from "@/lib/share";
import { loadSession } from "@/lib/session";
import type { Screen } from "@/store/useGameStore";

const IN_GAME_SCREENS = new Set<Screen>([
  "setup",
  "dashboard",
  "ledger",
  "properties",
  "player-detail",
  "banker-console",
]);

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="fixed right-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-muted shadow-[var(--shadow-card)] transition-colors hover:text-text"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function App() {
  const screen = useGameStore((s) => s.screen);
  const goTo = useGameStore((s) => s.goTo);
  const submitJoinCode = useGameStore((s) => s.submitJoinCode);
  const gameStatus = useDashboardStore((s) => s.status);

  useEffect(() => {
    const code = parseJoinCodeFromLocation();
    const session = loadSession();

    // Reopening the exact game you already have a player in (closed the tab
    // and came back via the same share link, or just the bare URL) should
    // resume that player, not run the join flow and mint a brand-new one —
    // the server has no other way to recognise a returning player.
    if (session && (!code || code === session.gameId)) {
      useDashboardStore.getState().connect(session);
      goTo("resuming");
      if (code) window.history.replaceState(null, "", "/");
      return;
    }

    if (code) {
      // The code came from a trusted share link, not user keystrokes — skip
      // the "enter the code" screen entirely and go straight to naming
      // yourself, same as if they'd typed and submitted it themselves.
      submitJoinCode(code);
      window.history.replaceState(null, "", "/");
    }
    // Only makes sense against the state the app booted with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The banker navigates to End Game Summary explicitly when they end the
  // game, but every other connected device only learns about it from the
  // server's gameEnd broadcast — without this they'd be stranded on
  // whatever screen they were on.
  useEffect(() => {
    if (gameStatus === "ended" && screen !== "end-game") {
      goTo("end-game");
    }
  }, [gameStatus, screen, goTo]);

  function renderScreen() {
    switch (screen) {
      case "setup":
        return <GameSetup />;
      case "dashboard":
        return <Dashboard />;
      case "ledger":
        return <Ledger />;
      case "properties":
        return <Properties />;
      case "player-detail":
        return <PlayerDetail />;
      case "banker-console":
        return <BankerConsole />;
      case "end-game":
        return <EndGameSummary />;
      default:
        return <JoinCreateGame />;
    }
  }

  return (
    <>
      <ThemeToggle />
      {IN_GAME_SCREENS.has(screen) && <ConnectionBanner />}
      {renderScreen()}
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: "var(--surface-3)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          },
        }}
      />
    </>
  );
}

export default App;

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Dices, KeyRound, Check, Loader2 } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { EDITIONS, formatCurrency, type EditionId } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { CodeInput } from "@/components/ui/code-input";
import { TOKENS } from "@/components/icons/tokens";
import { TokenBadge } from "@/components/icons/token-badge";
import { cn } from "@/lib/utils";

const spring = { type: "spring" as const, stiffness: 340, damping: 32 };

function Shell({
  children,
  onBack,
  eyebrow,
}: {
  children: React.ReactNode;
  onBack?: () => void;
  eyebrow: string;
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-5 pb-10 pt-8 sm:max-w-lg">
      <div className="mb-8 flex items-center gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-9 w-9" />
        )}
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-faint">
          {eyebrow}
        </span>
      </div>
      {children}
    </div>
  );
}

function Landing() {
  const goTo = useGameStore((s) => s.goTo);
  return (
    <motion.div
      key="landing"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={spring}
      className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-5 py-10 sm:max-w-lg"
    >
      <div className="mb-12 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green/15">
            <Dices className="h-8 w-8 text-green" strokeWidth={2.25} />
          </div>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-text sm:text-5xl">
          Monopoly <span className="text-green">Bank</span>
        </h1>
        <p className="mt-3 text-[15px] text-text-muted">
          The banker in your pocket. No cash, no counting — just the board.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => goTo("create")}
          className="group flex items-center gap-4 rounded-3xl border border-border bg-surface p-5 text-left shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green text-[#06170F]">
            <Dices className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="text-base font-bold text-text">Create a Game</div>
            <div className="text-sm text-text-muted">
              Start a new table, become the banker
            </div>
          </div>
        </button>

        <button
          onClick={() => goTo("join")}
          className="group flex items-center gap-4 rounded-3xl border border-border bg-surface p-5 text-left shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-3 text-gold">
            <KeyRound className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="text-base font-bold text-text">Join with Code</div>
            <div className="text-sm text-text-muted">
              Enter the 6-digit Game ID
            </div>
          </div>
        </button>
      </div>
    </motion.div>
  );
}

function ResumingFlow() {
  const goTo = useGameStore((s) => s.goTo);
  const resetToLanding = useGameStore((s) => s.resetToLanding);
  const gameId = useDashboardStore((s) => s.gameId);
  const connectionStatus = useDashboardStore((s) => s.connectionStatus);
  const hasSynced = useDashboardStore((s) => s.hasSynced);

  useEffect(() => {
    if (connectionStatus === "connected" && hasSynced) {
      goTo("dashboard");
    } else if (connectionStatus === "lost") {
      // The stored session is dead (game ended, or the server restarted) —
      // nothing to resume, so fall back to a normal join/create.
      resetToLanding();
    }
  }, [connectionStatus, hasSynced, goTo, resetToLanding]);

  return (
    <motion.div
      key="resuming"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={spring}
      className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center sm:max-w-lg"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green/15">
        <Dices className="h-8 w-8 text-green" strokeWidth={2.25} />
      </div>
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-text">
        Welcome back
      </h1>
      <p className="mt-2 max-w-xs text-[15px] text-text-muted">
        Reconnecting you to{" "}
        {gameId ? <span className="font-mono font-bold text-text">{gameId}</span> : "your table"}…
      </p>

      <div className="mt-8 flex items-center gap-2 rounded-full border border-border-soft bg-surface px-4 py-2 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Picking up where you left off
      </div>

      <button
        onClick={resetToLanding}
        className="mt-10 text-sm font-semibold text-text-faint transition-colors hover:text-text"
      >
        Start Over
      </button>
    </motion.div>
  );
}

function JoinFlow() {
  const goTo = useGameStore((s) => s.goTo);
  const joinCode = useGameStore((s) => s.joinCode);
  const joinError = useGameStore((s) => s.joinError);
  const setJoinCode = useGameStore((s) => s.setJoinCode);
  const submitJoinCode = useGameStore((s) => s.submitJoinCode);

  return (
    <motion.div
      key="join"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={spring}
    >
      <Shell eyebrow="Join a Game" onBack={() => goTo("landing")}>
        <h2 className="font-display text-2xl font-bold text-text">
          Enter the Game ID
        </h2>
        <p className="mt-2 mb-8 text-[15px] text-text-muted">
          Ask the banker for the 6-digit code shown on their screen.
        </p>

        <CodeInput
          value={joinCode}
          onChange={setJoinCode}
          onComplete={submitJoinCode}
        />
        {joinError && (
          <p className="mt-3 text-sm font-medium text-red">{joinError}</p>
        )}

        <Button
          size="lg"
          className="mt-10 w-full"
          onClick={() => submitJoinCode(joinCode)}
        >
          Join Game
        </Button>
      </Shell>
    </motion.div>
  );
}

function IdentityPicker({
  onSubmit,
  submitLabel,
  loading,
  error,
}: {
  onSubmit: () => void;
  submitLabel: string;
  loading: boolean;
  error: string | null;
}) {
  const identityName = useGameStore((s) => s.identityName);
  const identityToken = useGameStore((s) => s.identityToken);
  const setIdentityName = useGameStore((s) => s.setIdentityName);
  const setIdentityToken = useGameStore((s) => s.setIdentityToken);

  return (
    <>
      <div className="flex items-center gap-3">
        <TokenBadge token={identityToken} size={52} />
        <input
          autoFocus
          value={identityName}
          onChange={(e) => setIdentityName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Your name"
          className="h-14 flex-1 rounded-2xl border border-border bg-surface-2 px-4 text-lg font-bold text-text outline-none focus:border-gold focus:ring-2 focus:ring-focus"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {TOKENS.map((t) => (
          <button
            key={t.id}
            onClick={() => setIdentityToken(t.id)}
            aria-label={t.label}
            aria-pressed={identityToken === t.id}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-95",
              identityToken === t.id
                ? "ring-2 ring-gold ring-offset-2 ring-offset-bg"
                : "opacity-60 hover:opacity-100",
            )}
            style={{ background: t.band }}
          >
            <t.Icon className="h-6 w-6" style={{ color: t.id === "cat" ? "#2b2200" : "#fff" }} />
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm font-medium text-red">{error}</p>}

      <Button
        size="lg"
        className="mt-10 w-full gap-2"
        disabled={!identityName.trim() || loading}
        onClick={onSubmit}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </>
  );
}

function JoinDetailsFlow() {
  const goTo = useGameStore((s) => s.goTo);
  const gameId = useGameStore((s) => s.gameId);
  const confirmJoin = useGameStore((s) => s.confirmJoin);
  const isJoining = useGameStore((s) => s.isJoining);
  const joinError = useGameStore((s) => s.joinError);

  return (
    <motion.div
      key="join-details"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={spring}
    >
      <Shell eyebrow={`Joining ${gameId}`} onBack={() => goTo("join")}>
        <h2 className="font-display text-2xl font-bold text-text">
          What should we call you?
        </h2>
        <p className="mt-2 mb-8 text-[15px] text-text-muted">
          Your name and token show up on everyone's screen at the table.
        </p>
        <IdentityPicker
          onSubmit={confirmJoin}
          submitLabel="Join Table"
          loading={isJoining}
          error={joinError}
        />
      </Shell>
    </motion.div>
  );
}

function CreateDetailsFlow() {
  const goTo = useGameStore((s) => s.goTo);
  const edition = useGameStore((s) => EDITIONS[s.edition]);
  const confirmCreate = useGameStore((s) => s.confirmCreate);
  const isCreating = useGameStore((s) => s.isCreating);
  const createError = useGameStore((s) => s.createError);

  return (
    <motion.div
      key="create-details"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={spring}
    >
      <Shell eyebrow={`Creating · ${edition.label}`} onBack={() => goTo("create")}>
        <h2 className="font-display text-2xl font-bold text-text">
          What should we call you?
        </h2>
        <p className="mt-2 mb-8 text-[15px] text-text-muted">
          You'll be the banker — your name and token show up on everyone's screen.
        </p>
        <IdentityPicker
          onSubmit={confirmCreate}
          submitLabel="Create Table"
          loading={isCreating}
          error={createError}
        />
      </Shell>
    </motion.div>
  );
}

function JoinWaitingFlow() {
  const goTo = useGameStore((s) => s.goTo);
  const resetToLanding = useGameStore((s) => s.resetToLanding);
  const gameId = useGameStore((s) => s.gameId);
  const identityName = useGameStore((s) => s.identityName);
  const identityToken = useGameStore((s) => s.identityToken);
  const connectionStatus = useDashboardStore((s) => s.connectionStatus);
  const hasSynced = useDashboardStore((s) => s.hasSynced);

  useEffect(() => {
    if (connectionStatus === "connected" && hasSynced) {
      goTo("dashboard");
    }
  }, [connectionStatus, hasSynced, goTo]);

  return (
    <motion.div
      key="join-waiting"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={spring}
      className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center sm:max-w-lg"
    >
      <TokenBadge token={identityToken} size={84} />
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-text">
        You're in, {identityName}
      </h1>
      <p className="mt-2 max-w-xs text-[15px] text-text-muted">
        Connecting you to <span className="font-mono font-bold text-text">{gameId}</span>…
      </p>

      <div className="mt-8 flex items-center gap-2 rounded-full border border-border-soft bg-surface px-4 py-2 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Joining the table
      </div>

      <button
        onClick={resetToLanding}
        className="mt-10 text-sm font-semibold text-text-faint transition-colors hover:text-text"
      >
        Cancel
      </button>
    </motion.div>
  );
}

function EditionCard({
  id,
  selected,
  onSelect,
}: {
  id: EditionId;
  selected: boolean;
  onSelect: () => void;
}) {
  const edition = EDITIONS[id];
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-colors active:scale-[0.98]",
        selected
          ? "border-green bg-green/10"
          : "border-border bg-surface hover:bg-surface-2",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-xl font-bold",
          selected ? "bg-green text-[#06170F]" : "bg-surface-3 text-text-muted",
        )}
      >
        {edition.currencySymbol}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-text">{edition.label}</span>
          {selected && <Check className="h-4 w-4 text-green-strong" />}
        </div>
        <div className="mt-0.5 text-sm text-text-muted">{edition.tagline}</div>
        <div className="mt-2 flex items-center gap-3 font-mono text-xs text-text-faint">
          <span>
            Starts at{" "}
            <span className="font-bold text-text">
              {formatCurrency(edition.startingCash, edition)}
            </span>
          </span>
          <span className="opacity-50">·</span>
          <span>
            Pass Go{" "}
            <span className="font-bold text-text">
              {formatCurrency(edition.passGoAmount, edition)}
            </span>
          </span>
        </div>
      </div>
    </button>
  );
}

function CreateFlow() {
  const goTo = useGameStore((s) => s.goTo);
  const edition = useGameStore((s) => s.edition);
  const selectEdition = useGameStore((s) => s.selectEdition);
  const startCreate = useGameStore((s) => s.startCreate);

  return (
    <motion.div
      key="create"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={spring}
    >
      <Shell eyebrow="Create a Game" onBack={() => goTo("landing")}>
        <h2 className="font-display text-2xl font-bold text-text">
          Choose an edition
        </h2>
        <p className="mt-2 mb-6 text-[15px] text-text-muted">
          Sets the currency, city names, and starting cash for the table.
        </p>

        <div className="flex flex-col gap-3">
          <EditionCard
            id="international"
            selected={edition === "international"}
            onSelect={() => selectEdition("international")}
          />
          <EditionCard
            id="india"
            selected={edition === "india"}
            onSelect={() => selectEdition("india")}
          />
        </div>

        <Button size="lg" className="mt-10 w-full" onClick={startCreate}>
          Continue
        </Button>
      </Shell>
    </motion.div>
  );
}

export function JoinCreateGame() {
  const screen = useGameStore((s) => s.screen);

  return (
    <div className="min-h-svh bg-bg">
      <AnimatePresence mode="wait">
        {screen === "landing" && <Landing />}
        {screen === "resuming" && <ResumingFlow />}
        {screen === "join" && <JoinFlow />}
        {screen === "join-details" && <JoinDetailsFlow />}
        {screen === "join-waiting" && <JoinWaitingFlow />}
        {screen === "create" && <CreateFlow />}
        {screen === "create-details" && <CreateDetailsFlow />}
      </AnimatePresence>
    </div>
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Link2, Lock, QrCode, Share } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useGameStore } from "@/store/useGameStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { EDITIONS, formatCurrency } from "@/lib/locale";
import { TokenBadge } from "@/components/icons/token-badge";
import type { TokenId } from "@/components/icons/tokens";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getJoinUrl, shareJoinLink } from "@/lib/share";

const spring = { type: "spring" as const, stiffness: 340, damping: 32 };

function QrBlock({ value }: { value: string }) {
  const joinUrl = getJoinUrl(value);
  return (
    <div className="rounded-2xl bg-white p-4">
      <QRCodeSVG value={joinUrl} size={192} level="M" />
    </div>
  );
}

function CopyLinkRow({ gameId }: { gameId: string }) {
  const [copied, setCopied] = useState(false);
  const joinUrl = getJoinUrl(gameId);

  function copyLink() {
    navigator.clipboard?.writeText(joinUrl).catch(() => {});
    setCopied(true);
    toast.success("Join link copied");
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      onClick={copyLink}
      className="mt-4 flex w-full items-center gap-2.5 rounded-xl border border-border-soft bg-surface-2 px-3.5 py-3 text-left transition-colors hover:bg-surface-3"
    >
      <Link2 className="h-4 w-4 shrink-0 text-text-faint" />
      <span className="flex-1 truncate font-mono text-xs text-text-muted">{joinUrl}</span>
      {copied ? (
        <Check className="h-4 w-4 shrink-0 text-green-strong" />
      ) : (
        <Copy className="h-4 w-4 shrink-0 text-text-faint" />
      )}
    </button>
  );
}

function GameIdHeader() {
  const gameId = useDashboardStore((s) => s.gameId) ?? "";
  const editionId = useDashboardStore((s) => s.edition);
  const edition = EDITIONS[editionId];
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(gameId).catch(() => {});
    setCopied(true);
    toast.success("Game ID copied");
    setTimeout(() => setCopied(false), 1600);
  }

  async function share() {
    const result = await shareJoinLink(gameId, edition.label);
    if (result.method === "clipboard") toast.success("Join link copied");
    if (result.method === "failed") toast.error("Couldn't share the link");
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-faint">
          Game ID
        </span>
        <Dialog>
          <DialogTrigger asChild>
            <button
              aria-label="Show QR code"
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <QrCode className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle className="font-display text-lg font-bold text-text">
              Scan to join
            </DialogTitle>
            <p className="mb-4 mt-1 text-sm text-text-muted">
              Point a camera at this code to jump straight to the join screen.
            </p>
            <div className="flex justify-center">
              <QrBlock value={gameId} />
            </div>
            <div className="mt-4 text-center font-mono text-2xl font-bold tracking-[0.3em] text-text">
              {gameId}
            </div>
            <CopyLinkRow gameId={gameId} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-3 font-mono text-4xl font-bold tracking-[0.22em] text-text">
        {gameId}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button variant="primary" size="default" className="flex-1" onClick={share}>
          <Share className="h-4 w-4" />
          Share Link
        </Button>
        <button
          onClick={copy}
          aria-label="Copy game ID"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors active:scale-95",
            copied
              ? "border-green bg-green/10 text-green-strong"
              : "border-border bg-surface-3 text-text-muted hover:bg-surface-2 hover:text-text",
          )}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-3 text-sm text-text-muted">
        Anyone with the link or code can join — they'll show up below the moment they do.
      </p>
    </div>
  );
}

function PlayerRow({
  name,
  token,
  isBanker,
  isOnline,
}: {
  name: string;
  token: TokenId;
  isBanker: boolean;
  isOnline: boolean;
}) {
  const renameSelf = useDashboardStore((s) => s.renameSelf);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="flex items-center gap-3 rounded-2xl border border-border-soft bg-surface-2 p-3"
    >
      <div className="relative shrink-0">
        <TokenBadge token={token} />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-2",
            isOnline ? "bg-green-strong" : "bg-text-faint",
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        {isBanker ? (
          <input
            defaultValue={name}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              if (trimmed) {
                renameSelf(trimmed);
              } else {
                // Empty names are rejected rather than sent — reset the
                // field back to the real name instead of leaving it blank.
                e.target.value = name;
              }
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label="Your name"
            className="w-full truncate bg-transparent text-[15px] font-bold text-text outline-none focus:underline"
          />
        ) : (
          <div className="truncate text-[15px] font-bold text-text">{name}</div>
        )}
        {isBanker && (
          <div className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-gold">
            Banker · this device
          </div>
        )}
      </div>
    </motion.div>
  );
}

function RuleToggle({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 rounded-2xl border border-border-soft bg-surface-2 p-4",
        disabled && "opacity-50",
      )}
    >
      <div>
        <div className="text-[15px] font-bold text-text">{label}</div>
        <div className="mt-0.5 text-sm text-text-muted">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="mt-1" />
    </div>
  );
}

export function GameSetup() {
  const goTo = useGameStore((s) => s.goTo);
  const resetToLanding = useGameStore((s) => s.resetToLanding);
  const rules = useGameStore((s) => s.rules);
  const updateRule = useGameStore((s) => s.updateRule);
  const editionId = useDashboardStore((s) => s.edition);
  const players = useDashboardStore((s) => s.players);
  const useFreeParking = useDashboardStore((s) => s.useFreeParking);
  const setFreeParkingJackpot = useDashboardStore((s) => s.setFreeParkingJackpot);
  const trackProperties = useDashboardStore((s) => s.trackProperties);
  const setTrackProperties = useDashboardStore((s) => s.setTrackProperties);
  const allowAuction = useDashboardStore((s) => s.allowAuction);
  const setAllowAuction = useDashboardStore((s) => s.setAllowAuction);
  const trackHousePrices = useDashboardStore((s) => s.trackHousePrices);
  const setTrackHousePrices = useDashboardStore((s) => s.setTrackHousePrices);
  const edition = EDITIONS[editionId];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mx-auto min-h-svh w-full max-w-md px-5 pb-28 pt-8 sm:max-w-lg"
    >
      <div className="mb-6 flex items-center justify-between gap-3 pr-12">
        <button
          onClick={resetToLanding}
          className="shrink-0 text-sm font-semibold text-text-faint transition-colors hover:text-text"
        >
          Cancel
        </button>
        <span className="truncate text-right text-xs font-semibold uppercase tracking-[0.14em] text-text-faint">
          Game Setup · {edition.label}
        </span>
      </div>

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-text">
        Set the table
      </h1>
      <p className="mt-2 text-[15px] text-text-muted">
        You're the banker on this device. Share the code — everyone who joins appears below live.
      </p>

      <div className="mt-6">
        <GameIdHeader />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-faint">
            Players · {players.length}
          </h2>
          <span className="font-mono text-xs text-text-faint">
            Starting cash {formatCurrency(edition.startingCash, edition)}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {players.map((p) => (
              <PlayerRow key={p.id} {...p} />
            ))}
          </AnimatePresence>
          {players.length < 2 && (
            <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-text-faint">
              Waiting for players to join…
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-faint">
          House Rules
        </h2>
        <div className="flex flex-col gap-2">
          <RuleToggle
            label="Free Parking jackpot"
            description="Taxes and fines pool up and pay out to whoever lands on Free Parking."
            checked={useFreeParking}
            onCheckedChange={(v) => setFreeParkingJackpot(v)}
          />
          <RuleToggle
            label="Speed Die"
            description={
              edition.supportsSpeedDie
                ? "Third die active — triggers Bus Tickets and faster laps."
                : "Only available in the India edition."
            }
            checked={rules.speedDie}
            onCheckedChange={(v) => updateRule("speedDie", v)}
            disabled={!edition.supportsSpeedDie}
          />
          <RuleToggle
            label="Track properties"
            description="Buying requires picking a real property, and houses/hotels build up per-property. Turn off to just use free-text money transfers instead."
            checked={trackProperties}
            onCheckedChange={(v) => setTrackProperties(v)}
          />
          <RuleToggle
            label="Allow auctions"
            description="A declined property can be claimed by anyone at whatever it went for at the table."
            checked={allowAuction}
            onCheckedChange={(v) => setAllowAuction(v)}
            disabled={!trackProperties}
          />
          <RuleToggle
            label="Ask for house price"
            description="With Track properties off, also ask for a per-house build price when buying — so houses/hotels can still be tracked on that property."
            checked={trackHousePrices}
            onCheckedChange={(v) => setTrackHousePrices(v)}
            disabled={trackProperties}
          />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-border-soft bg-bg/90 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
          <div className="hidden items-center gap-1.5 text-xs text-text-faint sm:flex">
            <Lock className="h-3.5 w-3.5" />
            Locked until you start
          </div>
          <Button
            size="lg"
            className="ml-auto w-full sm:w-auto sm:flex-1"
            disabled={players.length < 2}
            onClick={() => goTo("dashboard")}
          >
            Start Game ({players.length} {players.length === 1 ? "player" : "players"})
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

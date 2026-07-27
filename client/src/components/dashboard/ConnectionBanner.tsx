import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useGameStore } from "@/store/useGameStore";

export function ConnectionBanner() {
  const status = useDashboardStore((s) => s.connectionStatus);
  const resetToLanding = useGameStore((s) => s.resetToLanding);
  const show = status === "reconnecting" || status === "disconnected" || status === "lost";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          role="status"
          className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col items-center gap-2 rounded-2xl border border-red/30 bg-surface px-4 py-2.5 text-sm font-semibold text-red shadow-lg"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            {status === "lost" ? "Couldn't reconnect" : status === "reconnecting" ? "Reconnecting…" : "You're offline"}
          </div>
          {status === "lost" && (
            <>
              <p className="max-w-[26ch] text-center text-xs font-normal text-text-muted">
                This table may no longer exist. Head back and rejoin with the game code.
              </p>
              <button
                onClick={resetToLanding}
                className="mt-0.5 rounded-full bg-red px-3 py-1 text-xs font-bold text-white"
              >
                Back to start
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

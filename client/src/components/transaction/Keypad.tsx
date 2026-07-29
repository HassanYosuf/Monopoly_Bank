import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"];

export function Keypad({ onKey }: { onKey: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKey(key)}
          aria-label={key === "back" ? "Delete" : key}
          className={cn(
            "flex aspect-[2/1] max-h-14 items-center justify-center rounded-2xl bg-surface-2 font-mono text-lg font-bold text-text transition-colors active:scale-95 active:bg-surface-3 sm:text-xl",
          )}
        >
          {key === "back" ? <Delete className="h-5 w-5" /> : key}
        </button>
      ))}
    </div>
  );
}

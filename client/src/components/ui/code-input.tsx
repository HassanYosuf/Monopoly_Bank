import { useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface CodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  className?: string;
}

export function CodeInput({
  length = 6,
  value,
  onChange,
  onComplete,
  className,
}: CodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = value.padEnd(length, " ").slice(0, length).split("");

  function setChar(index: number, char: string) {
    const next = chars.slice();
    next[index] = char;
    const joined = next.join("").replace(/\s+$/, "");
    onChange(joined);
    if (joined.length === length) onComplete?.(joined);
  }

  function handleChange(index: number, raw: string) {
    const clean = raw.replace(/[^0-9]/g, "");
    if (!clean) {
      setChar(index, " ");
      return;
    }
    const last = clean[clean.length - 1];
    setChar(index, last);
    if (index < length - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (chars[index] !== " " && chars[index] !== undefined) {
        setChar(index, " ");
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        setChar(index - 1, " ");
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, length);
    onChange(text);
    if (text.length === length) {
      onComplete?.(text);
      refs.current[length - 1]?.focus();
    } else {
      refs.current[text.length]?.focus();
    }
  }

  return (
    <div className={cn("flex gap-2 sm:gap-3", className)} role="group" aria-label="Game code">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={chars[i] === " " ? "" : chars[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          aria-label={`Digit ${i + 1} of ${length}`}
          className="h-14 w-11 min-w-0 flex-1 rounded-xl border border-border bg-surface-2 text-center font-mono text-2xl font-bold text-text outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-focus sm:h-16 sm:w-14 sm:text-3xl"
        />
      ))}
    </div>
  );
}

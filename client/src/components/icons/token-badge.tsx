import { tokenById, type TokenId } from "@/components/icons/tokens";
import { cn } from "@/lib/utils";

export function TokenBadge({
  token,
  size = 44,
  className,
}: {
  token: TokenId;
  size?: number;
  className?: string;
}) {
  const def = tokenById(token);
  const isDark = token === "cat";
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full shadow-sm", className)}
      style={{ width: size, height: size, background: def.band }}
    >
      <def.Icon
        style={{ width: size * 0.5, height: size * 0.5, color: isDark ? "#2b2200" : "#fff" }}
      />
    </div>
  );
}

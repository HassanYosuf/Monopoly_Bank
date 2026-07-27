import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: SwitchPrimitive.SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-[42px] shrink-0 cursor-pointer items-center rounded-full border border-border bg-surface-3 transition-colors data-[state=checked]:bg-green data-[state=checked]:border-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block h-[18px] w-[18px] translate-x-[2px] rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[21px]" />
    </SwitchPrimitive.Root>
  );
}

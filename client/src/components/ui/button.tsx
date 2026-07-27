import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-[filter,transform,background-color,box-shadow] duration-150 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  {
    variants: {
      variant: {
        primary:
          "bg-green text-[#06170F] shadow-[0_6px_16px_-6px_rgba(33,165,103,0.55)] hover:brightness-110",
        secondary:
          "bg-surface-3 text-text border border-border hover:bg-surface-2",
        destructive:
          "bg-transparent text-red border-[1.5px] border-red/45 hover:bg-red/10",
        ghost: "bg-transparent text-text-muted hover:text-text hover:bg-surface-2",
      },
      size: {
        default: "h-12 px-6 text-[15px]",
        lg: "h-14 px-8 text-base",
        sm: "h-9 px-4 text-sm",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

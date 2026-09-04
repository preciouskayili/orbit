import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff714e] disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "bg-[#ff714e] text-white hover:bg-[#ff8264]",
        secondary: "bg-white/[0.07] text-zinc-200 hover:bg-white/[0.11]",
        ghost: "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100",
        outline: "border border-white/[0.09] bg-transparent text-zinc-300 hover:bg-white/[0.05]",
        danger: "bg-rose-500/12 text-rose-300 hover:bg-rose-500/20",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2.5",
        icon: "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-zinc-100 text-zinc-900 hover:bg-white",
        secondary: "bg-white/[0.07] text-zinc-200 hover:bg-white/[0.11]",
        outline: "bg-white/[0.045] text-zinc-300 hover:bg-white/[0.08]",
        ghost: "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100",
        destructive: "bg-rose-500/12 text-rose-300 hover:bg-rose-500/20",
      },
      size: {
        default: "h-8 px-3 text-[12px]",
        xs: "h-6 px-2 text-[10px]",
        sm: "h-7 px-2.5 text-[11px]",
        lg: "h-9 px-4 text-[13px]",
        icon: "size-8",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant, size, ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };

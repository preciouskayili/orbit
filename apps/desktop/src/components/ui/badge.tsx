import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-medium",
  {
    variants: {
      variant: {
        default: "bg-zinc-100 text-zinc-900",
        secondary: "bg-white/[0.06] text-zinc-300",
        outline: "bg-white/[0.035] text-zinc-400",
        destructive: "bg-rose-500/12 text-rose-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, render, ...props }: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">({ className: cn(badgeVariants({ variant }), className) }, props),
    render,
    state: { slot: "badge", variant },
  });
}

export { Badge, badgeVariants };

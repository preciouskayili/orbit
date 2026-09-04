import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

function DropdownMenu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root {...props} />;
}

function DropdownMenuTrigger(props: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger {...props} />;
}

function DropdownMenuContent({ align = "start", side = "bottom", sideOffset = 6, className, ...props }: MenuPrimitive.Popup.Props & Pick<MenuPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner align={align} side={side} sideOffset={sideOffset} className="z-50 outline-none">
        <MenuPrimitive.Popup className={cn("min-w-40 rounded-xl border border-white/[0.08] bg-[#252628] p-1.5 text-zinc-200 shadow-2xl outline-none", className)} {...props} />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
  return <MenuPrimitive.GroupLabel className={cn("px-2 py-1.5 text-[11px] font-medium text-zinc-500", className)} {...props} />;
}

function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return <MenuPrimitive.Item className={cn("flex cursor-default select-none items-center gap-2 rounded-lg px-2 py-2 text-[12px] outline-none focus:bg-white/[0.07] focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props} />;
}

function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return <MenuPrimitive.Separator className={cn("-mx-0.5 my-1 h-px bg-white/[0.07]", className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
};

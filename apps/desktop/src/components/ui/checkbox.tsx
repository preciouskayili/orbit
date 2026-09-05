import { Checkbox as Primitive } from "@base-ui/react/checkbox";
import { Check } from "./icons";

export function Checkbox(props: Primitive.Root.Props) {
  return <Primitive.Root {...props} className="flex size-4 shrink-0 items-center justify-center rounded bg-white/10 outline-none data-[checked]:bg-zinc-300 data-[checked]:text-zinc-900 data-[disabled]:opacity-40 focus-visible:ring-2 focus-visible:ring-zinc-500">
    <Primitive.Indicator><Check className="size-3" weight="bold" /></Primitive.Indicator>
  </Primitive.Root>;
}

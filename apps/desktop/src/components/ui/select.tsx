import { Select } from "@base-ui/react/select";
import { CaretDown, Check } from "./icons";
import { cn } from "@/lib/utils";

// A small, owned styling layer over Base UI's keyboard and focus behavior.
export function SelectControl<T extends string | number>({
  label, value, options, onValueChange, disabled, className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onValueChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return <Select.Root value={value} items={options} disabled={disabled} onValueChange={next => { if (next !== null) onValueChange(next); }}>
    <Select.Trigger aria-label={label} className={cn("flex h-9 min-w-0 items-center justify-between gap-3 rounded-lg bg-white/[0.055] px-3 text-xs text-zinc-300 outline-none hover:bg-white/[0.085] focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:opacity-40", className)}>
      <Select.Value className="truncate" placeholder={label} /><CaretDown className="size-3 shrink-0 text-zinc-500" />
    </Select.Trigger>
    <Select.Portal><Select.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-[80] outline-none">
      <Select.Popup className="min-w-[var(--anchor-width)] max-h-[var(--available-height)] overflow-auto rounded-xl bg-[#303030] p-1.5 text-xs text-zinc-300 shadow-2xl outline-none">
        <Select.List>{options.map(option => <Select.Item key={option.value} value={option.value} className="flex min-h-8 cursor-default items-center gap-4 rounded-lg px-2.5 outline-none data-[highlighted]:bg-white/10">
          <Select.ItemText className="flex-1">{option.label}</Select.ItemText><Select.ItemIndicator><Check className="size-3" /></Select.ItemIndicator>
        </Select.Item>)}</Select.List>
      </Select.Popup>
    </Select.Positioner></Select.Portal>
  </Select.Root>;
}

import type { MachineStatus } from "@orbit/shared";
import { cn } from "@/lib/utils";

const statusStyles: Record<MachineStatus, string> = {
  running: "bg-emerald-400/10 text-emerald-300",
  stopped: "bg-zinc-400/10 text-zinc-400",
  starting: "bg-amber-400/10 text-amber-300",
  stopping: "bg-amber-400/10 text-amber-300",
  error: "bg-rose-400/10 text-rose-300",
};

export function StatusBadge({ status }: { status: MachineStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded px-1.5 text-[10px] font-medium capitalize",
        statusStyles[status],
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full bg-current",
          status === "running" && "shadow-[0_0_7px_currentColor]",
        )}
      />
      {status}
    </span>
  );
}

import {
  AppleLogo as Apple,
  Cpu,
  HardDrive,
  Memory as MemoryStick,
  Monitor,
  Terminal,
} from "@/components/ui/icons";
import type { Machine } from "@orbit/shared";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

function MachineIcon({ os }: Pick<Machine, "os">) {
  const Icon = os === "macos" ? Apple : os === "windows" ? Monitor : Terminal;
  return <Icon className="size-4" />;
}

export function MachineList({ machines }: { machines: Machine[] }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel">
      <div className="grid grid-cols-[1fr_112px_82px_82px_100px] border-b border-line px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-700">
        <span>Machine</span>
        <span>Status</span>
        <span>CPU</span>
        <span>Memory</span>
        <span>Storage</span>
      </div>
      {machines.map((machine, index) => (
        <button
          key={machine.id}
          onClick={() => navigate(`/projects/${machine.projectId}/machines/${machine.id}`)}
          className={cn(
            "grid w-full grid-cols-[1fr_112px_82px_82px_100px] items-center px-3 py-3 text-left hover:bg-white/[0.025]",
            index !== machines.length - 1 && "border-b border-line",
          )}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/[0.045] text-zinc-500">
              <MachineIcon os={machine.os} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-medium text-zinc-200">{machine.name}</span>
              <span className="mt-0.5 block text-[9px] text-zinc-600">{machine.osLabel}</span>
            </span>
          </span>
          <StatusBadge status={machine.status} />
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-500"><Cpu className="size-3 text-zinc-700" /> {machine.cpu}</span>
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-500"><MemoryStick className="size-3 text-zinc-700" /> {machine.ramGb} GB</span>
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-500"><HardDrive className="size-3 text-zinc-700" /> {machine.storageGb} GB</span>
        </button>
      ))}
    </div>
  );
}

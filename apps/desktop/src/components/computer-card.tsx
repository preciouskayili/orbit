import type { ActivityEvent, Machine } from "@orbit/shared";
import { Link } from "react-router-dom";
import { ArrowUpRight, Cpu, HardDrive, Memory } from "@/components/ui/icons";
import { StatusBadge } from "@/components/status-badge";
import { OsLogo } from "@/components/os-logo";

interface ComputerCardProps {
  machine: Machine;
  activity?: ActivityEvent;
  activityState: "loading" | "error" | "ready";
}

export function ComputerCard({
  machine,
  activity,
  activityState,
}: ComputerCardProps) {
  const lastSeen = new Date(machine.lastSeenAt);
  return (
    <Link
      to={`/computers/${machine.id}`}
      aria-label={`Open ${machine.name}`}
      className="group flex min-w-0 flex-col rounded-2xl bg-[#202121] p-4 transition-colors hover:bg-[#252626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`flex size-10 items-center justify-center rounded-xl ${machine.status === "running" ? "bg-emerald-400/[0.08] text-emerald-300" : "bg-white/[0.045] text-zinc-400"}`}
        >
          <OsLogo os={machine.os} />
        </span>
        <StatusBadge status={machine.status} />
      </div>
      <h2 className="mt-4 truncate text-sm font-medium text-zinc-100">
        {machine.name}
      </h2>
      <p className="mt-1 text-xs text-zinc-500">{machine.osLabel}</p>
      <dl className="my-4 grid grid-cols-3 gap-2 rounded-xl bg-black/[0.12] p-3">
        <div>
          <dt className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Cpu className="size-3" />
            CPU
          </dt>
          <dd className="mt-1.5 text-xs text-zinc-300">{machine.cpu} vCPU</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Memory className="size-3" />
            Memory
          </dt>
          <dd className="mt-1.5 text-xs text-zinc-300">{machine.ramGb} GB</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <HardDrive className="size-3" />
            Disk
          </dt>
          <dd className="mt-1.5 text-xs text-zinc-300">
            {machine.storageGb} GB
          </dd>
        </div>
      </dl>
      <div className="min-h-[70px]">
        <p className="text-[11px] text-zinc-500">Last recorded activity</p>
        <p className="mt-1.5 text-xs leading-5 text-zinc-400">
          {activityState === "error"
            ? "Activity unavailable"
            : activityState === "loading"
              ? "Loading activity…"
              : (activity?.title ?? "No activity recorded yet")}
        </p>
        {activity && (
          <p
            className="mt-1 truncate text-[11px] text-zinc-600"
            title={activity.detail}
          >
            {activity.detail}
          </p>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="min-w-0 text-[11px] text-zinc-500">
          Last seen{" "}
          <time dateTime={machine.lastSeenAt} title={lastSeen.toLocaleString()}>
            {lastSeen.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </time>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400 group-hover:text-zinc-100">
          Open computer
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

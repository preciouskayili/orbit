import type { Machine } from "@orbit/shared";
import { Link } from "react-router-dom";
import { OsLogo } from "@/components/os-logo";
import { StatusBadge } from "@/components/status-badge";
export function WorkspaceHeader({
  machines,
  activeMachineId,
}: {
  machines: Machine[];
  activeMachineId?: string;
}) {
  return (
    <header className="window-drag flex h-[54px] shrink-0 items-center gap-3 bg-[#1a1a1a] px-4">
      <nav
        aria-label="Computer tabs"
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
      >
        <Link
          to="/computers"
          className="shrink-0 rounded-lg px-3 py-2 text-xs text-zinc-400 hover:bg-white/5"
        >
          All computers
        </Link>
        {machines.map((m) => (
          <Link
            key={m.id}
            to={"/computers/" + m.id}
            aria-current={m.id === activeMachineId ? "page" : undefined}
            className={
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs " +
              (m.id === activeMachineId
                ? "bg-white/[0.075] text-zinc-200"
                : "text-zinc-500 hover:bg-white/5")
            }
          >
            <OsLogo os={m.os} className="size-3.5" />
            {m.name}
          </Link>
        ))}
      </nav>
      {machines.find((m) => m.id === activeMachineId) && (
        <StatusBadge
          status={machines.find((m) => m.id === activeMachineId)!.status}
        />
      )}
    </header>
  );
}

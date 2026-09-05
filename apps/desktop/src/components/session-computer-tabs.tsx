import { useParams, Link } from "react-router-dom";
import { useOrbit } from "@/hooks/use-orbit";
import { workspaceComputers } from "@/lib/orbit-selectors";
import { OsLogo } from "./os-logo";

// Only the current conversation's machines appear here, not the whole fleet.
export function SessionComputerTabs({ machineId }: { machineId: string }) {
  const { taskId } = useParams();
  const state = useOrbit();
  const session = state.tasks.find(
    (t) =>
      t.id === (taskId ?? state.activeConversations[state.workspaceId]) &&
      t.machineIds.includes(machineId) &&
      state.projects.some(
        (p) => p.id === t.projectId && p.workspaceId === state.workspaceId,
      ),
  );
  const machines = workspaceComputers(state).filter((m) =>
    session?.machineIds.includes(m.id),
  );
  if (machines.length < 2) return null;
  return (
    <nav
      aria-label="Session computers"
      className="flex shrink-0 gap-1 overflow-x-auto px-3 pb-2 pt-1"
    >
      {machines.map((m) => (
        <Link
          key={m.id}
          to={"/computers/" + m.id}
          aria-current={m.id === machineId ? "page" : undefined}
          className={
            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs " +
            (m.id === machineId
              ? "bg-white/[0.075] text-zinc-200"
              : "text-zinc-500 hover:bg-white/[0.035]")
          }
        >
          <OsLogo os={m.os} className="size-3.5" />
          {m.name}
        </Link>
      ))}
    </nav>
  );
}

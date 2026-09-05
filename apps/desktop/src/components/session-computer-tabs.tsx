import { useParams, Link, useNavigate } from "react-router-dom";
import { useOrbit } from "@/hooks/use-orbit";
import { workspaceComputers } from "@/lib/orbit-selectors";
import { OsLogo } from "./os-logo";
import { Plus, X } from "./ui/icons";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu";

export function SessionComputerTabs({ machineId, openMachineIds, onCloseComputer }: { machineId: string; openMachineIds?: string[]; onCloseComputer?: (id: string) => void }) {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const state = useOrbit();
  const session = openMachineIds ? undefined : state.tasks.find(
    (t) =>
      t.id === (taskId ?? state.activeConversations[state.workspaceId]) &&
      t.machineIds.includes(machineId) &&
      state.projects.some(
        (p) => p.id === t.projectId && p.workspaceId === state.workspaceId,
      ),
  );
  const fleet = workspaceComputers(state);
  const machines = openMachineIds
    ? openMachineIds.flatMap((id) => fleet.filter((m) => m.id === id))
    : fleet.filter((m) => !session || session.machineIds.includes(m.id));
  if (!machines.length) return null;
  return (
    <nav
      aria-label={session ? "Session computers" : "Workspace computers"}
      className="window-no-drag flex shrink-0 items-center gap-1 overflow-x-auto px-3 pb-2 pt-1"
    >
      {machines.map((m) => (
        <div
          key={m.id}
          className={
            "flex shrink-0 items-center rounded-lg text-xs " +
            (m.id === machineId
              ? "bg-white/[0.075] text-zinc-200"
              : "text-zinc-500 hover:bg-white/[0.035]")
          }
        >
          <Link
            to={session ? "/sessions/" + session.id + "?computer=" + m.id : "/computers/" + m.id}
            aria-current={m.id === machineId ? "page" : undefined}
            className="flex items-center gap-2 rounded-lg px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-500"
          >
            <OsLogo os={m.os} className="size-3.5" />
            {m.name}
          </Link>
          {onCloseComputer && (
            <button
              type="button"
              aria-label={"Close " + m.name}
              title={"Close " + m.name}
              onClick={() => onCloseComputer(m.id)}
              className="mr-1 flex size-6 items-center justify-center rounded-md text-zinc-500 hover:bg-white/10 hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-500"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      ))}
      {openMachineIds && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" />}
            aria-label="Open another computer"
            title="Open another computer"
            className="shrink-0"
          >
            <Plus className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-80 min-w-56 overflow-y-auto">
            <div className="px-2 py-1.5 text-[11px] text-zinc-500">Your computers</div>
            {fleet.map((computer) => (
              <DropdownMenuItem key={computer.id} onClick={() => navigate("/computers/" + computer.id)}>
                <OsLogo os={computer.os} className="size-4" />
                <span className="flex-1">{computer.name}</span>
                <span className="text-[11px] text-zinc-500">
                  {openMachineIds.includes(computer.id) ? "Open" : computer.status}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
}

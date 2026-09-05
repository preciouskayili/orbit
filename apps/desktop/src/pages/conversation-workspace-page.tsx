import { workspaceComputers } from "@/lib/orbit-selectors";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useOrbit } from "@/hooks/use-orbit";
import { ComputerEmptyState } from "@/components/computer-empty-state";
import { CreateMachineDialog } from "@/components/create-machine-dialog";
import { orbitActions } from "@/lib/orbit-store";
import { ComputerFleet } from "./project-overview-page";

import { MachineViewport } from "@/components/machine-viewport";

// A conversation owns context; the adjacent canvas shows its actual computers.
export function ConversationWorkspacePage() {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const state = useOrbit();
  const conversation = state.tasks.find(
    (t) =>
      t.id === taskId &&
      state.projects.some(
        (p) => p.id === t.projectId && p.workspaceId === state.workspaceId,
      ),
  );
  if (!conversation) return <ComputerFleet />;
  const computers = workspaceComputers(state).filter((m) => conversation.machineIds.includes(m.id));
  const machine = computers.find((m) => m.id === searchParams.get("computer")) ?? computers[0];
  if (!machine)
    return (
      <div className="flex h-full flex-col">
        <header className="window-drag h-[54px] shrink-0 px-5 py-4 text-sm text-zinc-500">
          Computers
        </header>
        <div className="flex flex-1 items-center justify-center overflow-auto">
          <ComputerEmptyState
            title="Your workspace is ready"
            description="Talk to your agent first, or add a computer now. Its desktop will open here, right beside your conversation."
          >
            <CreateMachineDialog
              onCreated={(ids) => {
                orbitActions.attachComputers(conversation.id, ids);
                navigate("/sessions/" + conversation.id + "?computer=" + ids[0]);
              }}
            />
            <Link
              to="/computers"
              className="rounded-lg px-3 py-2 text-xs text-zinc-400 hover:bg-white/5"
            >
              Browse fleet
            </Link>
          </ComputerEmptyState>
        </div>
      </div>
    );
  return (
    <div className="flex h-full min-h-0 flex-col">
      <MachineViewport key={machine.id} machine={machine} />
    </div>
  );
}

import { useParams, Link } from "react-router-dom";
import { MachineViewport } from "@/components/machine-viewport";
import { useOrbit } from "@/hooks/use-orbit";
import { workspaceComputers } from "@/lib/orbit-selectors";
import { Page, Empty } from "@/components/flow-ui";
export function MachineWorkspacePage() {
  const { machineId = "" } = useParams();
  const state = useOrbit();
  const machines = workspaceComputers(state);
  const machine = machines.find((m) => m.id === machineId);
  if (!machine)
    return (
      <Page title="Computer not found">
        <Empty title="This computer isn't in the current workspace">
          <Link to="/computers" className="underline">
            Back to computers
          </Link>
        </Empty>
      </Page>
    );
  return (
    <div className="flex h-full min-w-0 flex-col bg-[#171818]">
      <MachineViewport key={machineId} machine={machine} />
    </div>
  );
}

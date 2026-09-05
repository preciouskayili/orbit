import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MachineViewport } from "@/components/machine-viewport";
import { useOrbit } from "@/hooks/use-orbit";
import { workspaceComputers } from "@/lib/orbit-selectors";
import { Page, Empty } from "@/components/flow-ui";
export function MachineWorkspacePage() {
  const { machineId = "" } = useParams();
  const navigate = useNavigate();
  const state = useOrbit();
  const machines = workspaceComputers(state);
  const machine = machines.find((m) => m.id === machineId);
  const [opened, setOpened] = useState<{ workspaceId: string; ids: string[] }>({
    workspaceId: state.workspaceId,
    ids: [],
  });
  const openMachineIds = Array.from(new Set([
    ...(opened.workspaceId === state.workspaceId ? opened.ids : []),
    ...(machine ? [machine.id] : []),
  ])).filter((id) => machines.some((m) => m.id === id));
  useEffect(() => {
    setOpened({ workspaceId: state.workspaceId, ids: openMachineIds });
  }, [machineId, state.workspaceId]);
  const closeComputer = (id: string) => {
    const remaining = openMachineIds.filter((openId) => openId !== id);
    setOpened({ workspaceId: state.workspaceId, ids: remaining });
    if (id === machineId) {
      const nextId = remaining[Math.min(openMachineIds.indexOf(id), remaining.length - 1)];
      navigate(nextId ? "/computers/" + nextId : "/computers");
    }
  };
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
      <MachineViewport key={machineId} machine={machine} openMachineIds={openMachineIds} onCloseComputer={closeComputer} />
    </div>
  );
}

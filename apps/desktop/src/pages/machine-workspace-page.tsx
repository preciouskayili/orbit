import { cloudComputersEnabled } from "@/lib/computer-config";
import { cloudComputers } from "@/lib/cloud-computers";
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
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!cloudComputersEnabled || machine) return;
    let active = true;
    setLoadError("");
    void cloudComputers.get(state.workspaceId, machineId).catch((cause) => {
      if (active) setLoadError((cause as Error).message);
    });
    return () => { active = false; };
  }, [machineId, state.workspaceId]);
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
  if (!machine && cloudComputersEnabled && !loadError) return <Page title="Computer"><p role="status" className="p-5 text-xs text-zinc-500">Loading computer…</p></Page>;
  if (!machine)
    return (
      <Page title="Computer not found">
        <Empty title={loadError || "This computer isn't in the current workspace"}>
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

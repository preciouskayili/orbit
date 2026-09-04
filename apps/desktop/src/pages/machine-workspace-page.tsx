import { useParams } from "react-router-dom";
import { MachineViewport } from "@/components/machine-viewport";
import { ErrorState, LoadingState } from "@/components/query-state";
import { WorkspaceHeader } from "@/components/workspace-header";
import { useMachine, useMachines } from "@/hooks/queries";

export function MachineWorkspacePage() {
  const { projectId = "", machineId = "" } = useParams();
  const machineQuery = useMachine(machineId);
  const machinesQuery = useMachines(projectId);

  if (machineQuery.isLoading || machinesQuery.isLoading) return <LoadingState label="Connecting workspace" />;
  const error = machineQuery.error || machinesQuery.error;
  if (error) return <ErrorState error={error} />;
  if (!machineQuery.data) return null;

  return (
    <div className="flex h-full flex-col bg-[#171818]">
      <WorkspaceHeader projectId={projectId} machines={machinesQuery.data ?? []} activeMachineId={machineId} />
      <MachineViewport machine={machineQuery.data} />
    </div>
  );
}

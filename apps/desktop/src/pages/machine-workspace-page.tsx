import { useParams, Link } from "react-router-dom";
import { MachineViewport } from "@/components/machine-viewport";
import { WorkspaceHeader } from "@/components/workspace-header";
import { useOrbit } from "@/hooks/use-orbit";
import { Page, Empty } from "@/components/flow-ui";
export function MachineWorkspacePage() {
  const { projectId = "", machineId = "" } = useParams();
  const state = useOrbit();
  const project = state.projects.find(p => p.id === projectId && p.workspaceId === state.workspaceId);
  const machine = state.machines.find(m => m.id === machineId && m.projectId === projectId);
  if (!project || !machine) return <Page title="Computer not found"><Empty title="This computer isn't in the current workspace"><Link to="/projects" className="underline">Back to projects</Link></Empty></Page>;
  return <div className="flex h-full min-w-0 flex-col bg-[#171818]"><WorkspaceHeader projectId={projectId} machines={state.machines.filter(m => m.projectId === projectId)} activeMachineId={machineId} /><MachineViewport key={machineId} machine={machine} /></div>;
}

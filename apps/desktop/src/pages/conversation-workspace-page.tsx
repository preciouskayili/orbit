import { useParams } from "react-router-dom";
import { useOrbit } from "@/hooks/use-orbit";
import { ComputerFleet } from "./project-overview-page";
import { ProjectsPage } from "./projects-page";
import { MachineViewport } from "@/components/machine-viewport";
import { WorkspaceHeader } from "@/components/workspace-header";

// A conversation owns context; the adjacent canvas shows its actual computers.
export function ConversationWorkspacePage() {
  const { taskId } = useParams();
  const state = useOrbit();
  const conversation = state.tasks.find(t => t.id === taskId && state.projects.some(p => p.id === t.projectId && p.workspaceId === state.workspaceId));
  if (!conversation) return <ProjectsPage />;
  const machine = state.machines.find(m => conversation.machineIds.includes(m.id));
  if (!machine) return <ComputerFleet key={conversation.projectId} projectId={conversation.projectId} />;
  return <div className="flex h-full min-h-0 flex-col"><WorkspaceHeader projectId={machine.projectId} activeMachineId={machine.id} machines={state.machines.filter(m => m.projectId === machine.projectId)} /><MachineViewport key={machine.id} machine={machine} /></div>;
}

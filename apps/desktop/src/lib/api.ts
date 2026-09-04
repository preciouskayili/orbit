// Frontend prototype adapter. Replace these methods with HTTP calls when the
// backend is ready; the existing query hooks and fleet components stay intact.
import { getOrbitState, orbitActions } from "./orbit-store";
import type { CreateMachineInput } from "@orbit/shared";
function visibleProjects() {
  const state = getOrbitState();
  return state.projects.filter(p => p.workspaceId === state.workspaceId);
}
function requireProject(projectId: string) {
  const project = visibleProjects().find(p => p.id === projectId);
  if (!project) throw new Error("Project not found in this workspace.");
  return project;
}
export const orbitApi = {
  projects: async () => visibleProjects(),
  project: async (projectId: string) => requireProject(projectId),
  machines: async (projectId: string) => { requireProject(projectId); return getOrbitState().machines.filter(m => m.projectId === projectId); },
  machine: async (machineId: string) => {
    const machine = getOrbitState().machines.find(m => m.id === machineId);
    if (!machine) throw new Error("Computer not found.");
    requireProject(machine.projectId); return machine;
  },
  activity: async (projectId: string) => { requireProject(projectId); return getOrbitState().activity.filter(a => a.projectId === projectId); },
  messages: async (projectId: string) => { requireProject(projectId); return getOrbitState().messages.filter(m => m.projectId === projectId); },
  createMachine: async (projectId: string, input: CreateMachineInput) => {
    const [id] = orbitActions.createFleet(projectId, input);
    return getOrbitState().machines.find(m => m.id === id)!;
  },
};

import type { OrbitState } from "./orbit-store";

export function workspaceComputers(state: OrbitState) {
  return state.machines.filter(
    (m) =>
      (m.workspaceId ??
        state.projects.find((p) => p.id === m.projectId)?.workspaceId) ===
      state.workspaceId,
  );
}
export function projectComputers(state: OrbitState, projectId: string) {
  const activeIds = new Set(
    state.tasks
      .filter(
        (t) =>
          t.projectId === projectId &&
          !["completed", "cancelled"].includes(t.status),
      )
      .flatMap((t) => t.machineIds),
  );
  return workspaceComputers(state).filter((m) => activeIds.has(m.id));
}

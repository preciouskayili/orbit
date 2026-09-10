import { useEffect } from "react";
import { liveAgentsEnabled } from "@/lib/computer-config";
import { agentActive, liveAgents } from "@/lib/live-agents";
import { getOrbitState, subscribeOrbit } from "@/lib/orbit-store";

// Stay mounted when chat is hidden or a different conversation is selected.
export function LiveAgentSync() {
  useEffect(() => {
    if (!liveAgentsEnabled) return;
    const tick = () => {
      const state = getOrbitState();
      for (const task of state.tasks.filter(agentActive)) {
        const workspace = state.projects.find((p) => p.id === task.projectId)?.workspaceId;
        if (workspace === state.workspaceId) void liveAgents.poll(workspace, task);
      }
    };
    let controls = JSON.stringify(getOrbitState().control);
    const unsubscribe = subscribeOrbit(() => {
      const next = JSON.stringify(getOrbitState().control);
      if (next !== controls) { controls = next; tick(); }
    });
    tick();
    const timer = setInterval(tick, 600);
    return () => { clearInterval(timer); unsubscribe(); };
  }, []);
  return null;
}
